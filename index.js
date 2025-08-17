const express = require("express");
const http = require("http");
// const { RtcTokenBuilder, RtcRole } = require("agora-access-token");
const { Server } = require("socket.io");

const app = express();
app.use(express.json());
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
const PORT = 4000;
// const AGORA_APP_ID = "020850dba286443a8a3a6a7cc6435da4";
// const AGORA_APP_CERTIFICATE = "89fb86e6c8054ec28b6c067eeca6c700";
//AGORA START HERE
// Function to generate Agora token
// app.post("/get-token", (req, res) => {
//     const { channelName, uid } = req.body;
//     const expirationTime = 3600; // 1 hour

//     const token = RtcTokenBuilder.buildTokenWithUid(
//         AGORA_APP_ID,
//         AGORA_APP_CERTIFICATE,
//         channelName,
//         uid,
//         RtcRole.PUBLISHER,
//         expirationTime
//     );

//     res.json({ token });
// });
//AGORA END HERE


//cors policy
// app.use(cors());
// app.options("*", cors());
// Store active drivers
let activeDrivers = {};
let activeRiders = [];
let activeDriversArr = [];
io.on('connection', (socket) => {
    // console.log('A user connected:', socket.id);

    // When a driver comes online
    socket.on('driver-online', (driverData) => {
        activeDrivers[socket.id] = driverData; // Save driver info
        console.log('driverData', driverData)
        if (driverData?.id) {
            // Remove any existing record for this rider
            activeDriversArr = activeDriversArr.filter(r => r.id !== driverData.id);
            // Push the updated data (new socketId, etc.)
            activeDriversArr.push(driverData);
            console.log('activeDriversArr', activeDriversArr)
        }
    });
    // When a rider comes online
    socket.on('rider-online', (riderData) => {
        if (riderData?.id) {
            // Remove any existing record for this rider
            activeRiders = activeRiders.filter(r => r.id !== riderData.id);
            // Push the updated data (new socketId, etc.)
            activeRiders.push(riderData);
        }
    });

    // Listen for ride requests
    socket.on('ride-request', (rideDetails) => {
        console.log('Ride Requested:', rideDetails);//ccc

        // Notify all active drivers
        for (let driverSocketId in activeDrivers) {
            io.to(driverSocketId).emit('new-ride', rideDetails);
        }
    });

    // When a driver accepts the ride
    socket.on('ride-accepted', (res) => {

        // Find the latest socketId for the rider from activeRiders array
        const rider = activeRiders.find(r => r.id === res.rideInfo.rider_id);
        // console.log('rider after check', rider)
        if (rider && rider.riderSocketId) {
            // console.log('rider.riderSocketId', rider.riderSocketId)
            io.to(rider.riderSocketId).emit('ride-status', {
                status: 'accepted',
                data: res
            });
            // console.log(`Ride accepted info sent to rider ${rider.id}`);
        } else {
            // console.log(`No active socket found for rider ${res.rideInfo.rider_id}`);
        }
        //send other driver a to hide accepted ride
        for (let driverSocketId in activeDrivers) {
            io.to(driverSocketId).emit('accepted_ride_id', res?.rideInfo?.id);
        }

    });
    // When a driver start ride
    socket.on('isRideStarted', (res) => {
        // console.log('Ride Started by driver:', res.riderSocketId);

        // Notify the rider
        // io.to(res.riderSocketId).emit('isRideStartedByDriver', {
        //     status: true,
        //     data: res,
        // });
        const rider = activeRiders.find(r => r.id === res.rideInfo.rider_id);

        if (rider && rider.riderSocketId) {
            io.to(rider.riderSocketId).emit('isRideStartedByDriver', {
                status: true,
                data: res
            });
            // console.log(`Ride status sent to rider ${rider.id}`);
        } else {
            // console.log(`No active socket found for rider ${res.rideInfo.rider_id}`);
        }
    });
    // When a driver complete ride
    socket.on('ride-completed', (res) => {
        // console.log('Ride Completed by driver:', res.riderSocketId);

        // Notify the rider
        // io.to(res.riderSocketId).emit('ride-completed-by-driver', {
        //     status: true,
        //     data: res,
        // });
        const rider = activeRiders.find(r => r.id === res.rideInfo.rider_id);

        if (rider && rider.riderSocketId) {
            io.to(rider.riderSocketId).emit('ride-completed-by-driver', {
                status: true,
                data: res
            });
            // console.log(`Ride status sent to rider ${rider.id}`);
        } else {
            // console.log(`No active socket found for rider ${res.rideInfo.rider_id}`);
        }
    });
    // When a rider cancel a ride
    socket.on('cancel-ride-by-rider', (res) => {
        const driver = activeDriversArr.find(r => r.id === res.driverId);

        if (driver && driver.driverSocketId) {
            io.to(driver.driverSocketId).emit('cancel-ride-by-rider', {
                status: true,
                data: res
            });
            console.log(`Ride status sent to driver`);
        } else {
            console.log(`No active socket found for rider ${res?.driverId}`);
        }
    });
    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        delete activeDrivers[socket.id];
    });


    //CHATTING FUNCTIONALITY START HERE
    // Join a room for private chat
    // socket.on('joinRoom', ({ userId }) => {//off for calling 
    //     socket.join(userId); // userId acts as room ID
    // });
    // Handle sending messages
    socket.on('sendMessage', async ({ senderId, receiverId, message, type }) => {
        // const newMessage = new Message({ senderId, receiverId, message, type });
        const newMessage = { senderId, receiverId, message, type };
        // await newMessage.save();

        // Emit to the receiver's room
        io.to(receiverId).emit('receiveMessage', newMessage);
    });
    // socket.on('disconnect', () => {
    //     console.log('Client disconnected:', socket.id);
    // });
    //CHATTING FUNCTIONALITY END HERE
    //CALLING FUNCTION START HERE
    socket.on("callUser", ({ receiverId, channelName, callerId }) => {
        io.to(receiverId).emit("incomingCall", { channelName, callerId });
    });

    socket.on("joinRoom", (userId) => {
        socket.join(userId);
    });

    // socket.on("disconnect", () => {
    //     console.log("User disconnected:", socket.id);
    // });
    //CALLING FUNCTION END HERE




});
// io.on("connection", (socket) => {
//     console.log("A user connected:", socket.id);

//     socket.on("disconnect", () => {
//         console.log("User disconnected:", socket.id);
//     });
// });
app.get("/", (req, res) => {
    res.send("Server is working!");
});
//



server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
