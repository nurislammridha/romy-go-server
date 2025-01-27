const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
const PORT = 4000;
//cors policy
// app.use(cors());
// app.options("*", cors());
// Store active drivers
let activeDrivers = {};
console.log('234', 123)
io.on('connection', (socket) => {
    console.log('111', 111)
    console.log('A user connected:', socket.id);

    // When a driver comes online
    socket.on('driver-online', (driverData) => {
        activeDrivers[socket.id] = driverData; // Save driver info
        console.log('Active Drivers:', activeDrivers);
    });

    // Listen for ride requests
    socket.on('ride-request', (rideDetails) => {
        console.log('Ride Requested:', rideDetails);

        // Notify all active drivers
        for (let driverSocketId in activeDrivers) {
            io.to(driverSocketId).emit('new-ride', rideDetails);
        }
    });

    // When a driver accepts the ride
    socket.on('ride-accepted', (res) => {
        console.log('Ride Accepted by:', res);

        // Notify the rider
        io.to(res.riderSocketId).emit('ride-status', {
            status: 'accepted',
            data: res,
        });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        delete activeDrivers[socket.id];
    });
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
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
