import express from 'express'
import dotenv from 'dotenv'
import chats from './data/data.js';
import connectDB from './config/db.js';
import userRoutes from './routes/userRoutes.js'
import chatRoutes from './routes/chatRoutes.js'
import { errorHandler, notFound } from './middleware/errorMiddleware.js';
import messageRoutes from './routes/messageRoutes.js'
import { Server as SocketServer } from "socket.io";
import path from 'path'

const app = express()
const PORT = process.env.PORT || 5000;
dotenv.config();
connectDB();

app.get('/', (req, res) => {
    res.send("API is running")
})

app.use(express.json());

app.use('/api/user', userRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/message', messageRoutes)

const __dirname1= path.resolve();
if(process.env.NODE_ENV=== 'production'){
    app.use(express.static(path.join(__dirname1,'/frontend/build')))

    app.get("*",(req,res)=>{
        res.sendFile(path.resolve(__dirname1,"frontend","bulid","index.html"))
    })
}else{
    app.get("/",(req,res)=>{
        res.send("API Is Running Successfully")
    })
}


app.use(notFound)
app.use(errorHandler)

const server = app.listen(PORT, () => console.log(`Server is listening at http://localhost:${PORT}`))

const io = new SocketServer(server, {
    pingTimeout: 60000,
    cors: {
        origin: "http://localhost:3000",
    },
})

io.on("connection", (socket) => {
    console.log("connected to socket.io")

    socket.on("setup", (userData) => {
        socket.join(userData._id);
        socket.emit("connected");
    });

    socket.on('join chat', (room) => {
        socket.join(room)
        console.log("User Joined Room" + room)
    });

    socket.on('typing', (room) => {
        socket.in(room).emit('typing')
    });

    socket.on('stopTyping', (room) => {
        socket.in(room).emit('stopTyping')
    });

    socket.on('new message', (newMessageRecieved) => {
        var chat = newMessageRecieved.chat;
        if (!chat.users) return console.log("chat.users is not defined");
        chat.users.forEach(user => {
            if (user._id == newMessageRecieved.sender._id) return;

            socket.in(user._id).emit("message recieved", newMessageRecieved);
        });
    })
})