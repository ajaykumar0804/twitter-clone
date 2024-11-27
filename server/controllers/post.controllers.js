import Post from "../models/post.model.js";
import User from "../models/user.model.js";
import cloudinary from "cloudinary";
import Notification from "../models/notification.model.js";

//Create Post
export const createPost = async (req, res) => {
    try {
        const { text } = req.body;
        let { img } = req.body;
        const userId = req.user._id.toString();

        const user = await User.findOne({ _id: userId })
        if (!user) {
            return res.status(404).json({ error: "User not found" })
        }

        if (!text && !img) {
            return res.status(400).json({ error: "Post Must have text or Image" })
        }
        if (img) {
            const uploadedResponse = await cloudinary.uploader.upload(img);
            img = uploadedResponse.secure_url;

        }
        const newPost = new Post({
            user: userId,
            text,
            img
        })
        await newPost.save();
        res.status(201).json(newPost);
    } catch (error) {
        console.log(`Error in create post controller:${error}`);
        res.status(500).json({ error: "Internal Server error" });
    }
}

//Deleting Post
export const deletePost = async (req, res) => {
    try {
        const { id } = req.params;

        const post = await Post.findOne({ _id: id });
        //checking whether post is available in this id or not
        if (!post) {
            return res.status(404).json({ error: "Post not found." });
        }
        //we need to find the correct authorized person to delete this post
        if (post.user.toString() !== req.user._id.toString()) {
            return res.status(401).json({ error: "You are not Authorized person to delete this post" })
        }
        //here we need to delete post image from the cloudinary
        if (post.img) {
            const imgId = post.img.split("/").pop().split(".")[0];
            await cloudinary.destroy(imgId);
        }

        await Post.findByIdAndDelete({ _id: id });
        res.status(200).json({ message: "Post deleted successfully" });

    } catch (error) {
        console.log(`Error in deleteing post controller:${error}`);
        res.status(500).json({ error: "Internal server error" });
    }
}

//Create Comment
export const createComment = async (req, res) => {
    try {
        const { text } = req.body;
        const postId = req.params.id;
        const userId = req.user._id;
        if (!text) {
            return res.status(400).json({ error: "Comment text is Required" });
        }
        const post = await Post.findOne({ _id: postId });
        if (!post) {
            return res.status(404).json({ error: "Post not Found" })
        }

        const comment = {
            user: userId,
            text
        }

        post.comments.push(comment);
        await post.save();
        res.status(200).json(post);
    } catch (error) {
        console.log(`Error in creating comment controller:${error}`);
        res.status(500).json({ error: "Internal server error" });
    }
}

//Like and Unlike to a Post

export const likeUnlikePost = async (req, res) => {
    try {
        const userId = req.user._id;
        const { id: postId } = req.params;

        const post = await Post.findOne({ _id: postId });
        if (!post) {
            return res.status(404).json({ error: "Post not found." });

        }

        const userLikedPost = post.likes.includes(userId);
        if (userLikedPost) {
            //Unlike Post
            await Post.updateOne({ _id: postId }, { $pull: { likes: userId } });
            await User.updateOne({ _id: userId }, { $pull: { likedPosts: postId } })

            const updatedLikes=post.likes.filter((id)=>id.toString() !== userId.toString())//It will take the liked id except currently login user Id 
            res.status(200).json(updatedLikes);//send that as a repond 
        } else {
            //Like the post
            post.likes.push(userId);
            await User.updateOne({ _id: userId }, { $push: { likedPosts: postId } })
            await post.save();

            const notification = new Notification({
                from: userId,
                to: post.user,
                type: "like"
            })
            await notification.save();
            const updatedLikes=post.likes;
            res.status(200).json(updatedLikes);
        }


    } catch (error) {
        console.log(`Error in Like and Unlike post controller:${error}`);
        res.status(500).json({ error: "Internal server error" });
    }
}

//To Get All The Posts
export const getAllPosts = async (req, res) => {
    try {
        const posts = await Post.find().sort({ createdAt: -1 }).populate({
            path: "user",
            select: "-password"
        })
            .populate({
                path: "comments.user",
                select: ["-password", "-email", "-following", "-followers", "-bio", "-link"]
            })
        if (posts.length === 0) {
            return res.status(200).json([]);
        }
        res.status(200).json(posts)
    } catch (error) {
        console.log(`Error in Get All posts controller:${error}`);
        res.status(500).json({ error: "Internal server error" });
    }
}

//Get Liked Posts
export const getLikedPosts = async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findById({ _id: userId })
        if (!user) {
            return res.status(404).json({ error: "user not found" });
        }
        const likedPosts = await Post.find({ _id: { $in: user.likedPosts } })
            .populate({
                path: "user",
                select: "-password"
            })
            .populate({
                path: "comments.user",
                select: ["-password", "-email", "-following", "-followers", "-bio", "-link"]
            })

        res.status(200).json(likedPosts);
    } catch (error) {
        console.log(`Error in Get Liked posts controller:${error}`);
        res.status(500).json({ error: "Internal server error" });
    }
}

//Get Following Posts
export const getFollowingPosts = async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById({ _id: userId });

        if (!user) {
            return res.status(404).json({ error: "User not found" })
        }
        const following = user.following;

        const feedPosts = await Post.find({ user: { $in:  following } })
            .sort({ createdAt: -1 })
            .populate({
                path: "user",
                select: "-password"
            })
            .populate({
                path: "comments.user",
                select: "-password"
            })

        res.status(200).json(feedPosts)
    } catch (error) {
        console.log(`Error in Get Following posts controller:${error}`);
        res.status(500).json({ error: "Internal server error" });
    }
}

//Get User posts
export const getUserPosts = async (req, res) => {
    try {
        const {username} = req.params;
        const user = await User.findOne({ username });

        if (!user) {
            return res.status(404).json({ error: "User not found" })
        }

        const posts = await Post.find({ user: user._id })
            .sort({ createdAt: -1 })
            .populate({
                path: "user",
                select: "-password"
            })
            .populate({
                path: "comments.user",
                select: "-password"
            })

        res.status(200).json(posts)

    } catch (error) {
        console.log(`Error in Get User posts controller:${error}`);
        res.status(500).json({ error: "Internal server error" });
    }
}