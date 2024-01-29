import asyncHandler from "express-async-handler";
import Chat from '../models/chatModel.js'
import User from "../models/userModel.js";

// To access a single chat 
const accessChat = asyncHandler(async (req, res) => {
    const { userId } = req.body;
    if (!userId) {
        res.status(400)
    }
    var isChat = await Chat.find({
        isGroupChat: false,
        $and: [
            { users: { $elemMatch: { $eq: req.user.id } } },
            { users: { $elemMatch: { $eq: userId } } },
        ]
    }).populate("users", "-password").populate("latestMessage");
    isChat = await User.populate(isChat, {
        path: "latestMessage.sender", select: "name pic email",
    });
    if (isChat.length > 0) {
        res.send(isChat[0]);
    } else {
        let chatData = {
            chatName: "sender",
            isGroupChat: false,
            users: [req.user._id, userId],
        };
        try {
            const createdChat = await Chat.create(chatData)
            const FullChat = await Chat.findOne({ _id: createdChat.id }).populate("users", "-password");
            res.status(200).send(FullChat)
        } catch (error) {
            res.status(400)
            throw new Error(error.message)
        }
    }

});

// To fetch all the chats 
const fetchChats = asyncHandler(async (req, res) => {
    try {
        Chat.find({ users: { $elemMatch: { $eq: req.user._id } } })
            .populate("users", "-password")
            .populate("groupAdmin", "-password")
            .populate("latestMessage")
            .sort({ updatedAt: -1 })
            .then(async (results) => {
                results = await User.populate(results, {
                    path: "latestMessage.sender", select: "name pic email",
                })
                res.status(200).send(results)
            }
            );
    } catch (error) {
        res.status(400)
        throw new Error(error.message)
    }
});

// to create a new group chat
const createGroupChat = asyncHandler(async (req, res) => {
    if (!req.body.users || !req.body.name) {
        return res.status(400).send({ "message": "PLease Fill All The Fields" });
    }
    var users = JSON.parse(req.body.users)
    if (users.length < 2) {
        return res.status(400).send("More than 2 users are requested to form a group chat")
    }
    users.push(req.user);
    try {
        const groupChat = await Chat.create({
            chatName: req.body.name,
            users: users,
            isGroupChat: true,
            groupAdmin: req.user,
        });

        const fullGroupChat = await Chat.findOne({ _id: groupChat._id })
            .populate("users", "-password")
            .populate("groupAdmin", "-password")

        res.status(200).json(fullGroupChat)
    } catch (error) {

    }
});

// To rename a group Already exist
const renameGroup = asyncHandler(async (req, res) => {
    const { chatId, chatName } = req.body;
    const updateChat = await Chat.findByIdAndUpdate(chatId, { chatName }, { new: true })
        .populate("users", "-password")
        .populate("groupAdmin", "-password")

    if (!updateChat) {
        res.status(400);
        throw new Error("Chat not found");
    } else {
        res.status(200).json(updateChat)
    }
})

// To Add a user to a group
const addToGroup = asyncHandler(async (req, res) => {
    const {chatId,userId} = req.body;
    const added= await Chat.findByIdAndUpdate(chatId,{$push:{users:userId}},{new:true})
    .populate("users","-password")
    .populate("groupAdmin","-password")
    if (!added){
        res.status(400)
        throw new Error("Chat not found")
    }else{
        res.json(added);
    }
})

// To remove a user from a group
const removeFromGroup = asyncHandler(async (req, res) => {
    const { chatId, userId } = req.body;
    const removed =await Chat.findByIdAndUpdate(chatId, { $pull: { users: userId } }, { new: true })
        .populate("users", "-password")
        .populate("groupAdmin", "-password")
    if (!removed) {
        res.status(400)
        throw new Error("Chat not found")
    } else {
        res.json(removed);
    }
})



export { accessChat, fetchChats, createGroupChat, renameGroup, addToGroup, removeFromGroup }