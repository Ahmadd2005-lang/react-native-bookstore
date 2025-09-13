import express from "express";
import imageKit from "../lib/imagekit.js";
import Book from "../models/Book.js";
import protectRoute from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", protectRoute, async (req,res) => {
    try {
    
        const { title, caption, rating, image } = req.body;

        if(!image || !title || !caption || !rating) {
            return res.status(400).json({ message: "Please provide all fields" });
        }

        // upload the image to imagekit
        const uploadResponse = await imageKit.upload({
            file: image,       // can be a file path, base64 string, or URL
            fileName: "book-cover.jpg",
        });

        const imageUrl = uploadResponse.url;
        // const fileId = uploadResponse.fileId;


        // save to the database
        const newBook = new Book({
            title,
            caption,
            rating,
            image: imageUrl,
            user: req.user._id,
        });

        await newBook.save();

        res.status(201).json(newBook);

    }catch(e){
        console.log("Error creating book", e);
        res.status(500).json({ message: e.message });
    }
});

router.get("/", protectRoute, async (req,res) => {
    // example call from react native - frontend
    // const response = await fetch("http://localhost:3000/api/books?page=1&limit=5");
    try {
        const page = req.query.page || 1;
        const limit = req.query.limit || 5;
        const skip = (page-1) * limit;

        const books = await Book.find()
        .sort({ createdAt: -1 }) // desc order
        .skip(skip)
        .limit(limit)
        .populate("user", "username profileImage");

        const totalBooks = await Book.countDocuments();

        res.send({
            books,
            currentPage: page,
            totalBooks,
            totalPages: Math.ceil(totalBooks / limit),
        });

    } catch (e) {
        console.log("Error in get all books route", e);
        res.status(500).json({ message: "Internal server error" });
    }
});

// get recommended books by the logged in user
router.get("/user", protectRoute, async(req,res) => {
    try {
        const books = await Book.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.json(books);
    }catch(e) {
        console.log("Get user books error:", e.message);
        res.status(500).json({ message: "Server error" });
    }
});

router.delete("/:id", protectRoute, async (req,res) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) return res.status(404).json({ message: "Book not found" });

        // check if user is the creator of the book
        if (book.user.toString() !== req.user._id.toString())
            return res.status(401).json({ message: "Unauthorized" });

        // delete image from imagekit as well
        // if(book.image && book.image.includes("imagekit")) {
        //     try {
        //         const publicId = book.image.replace("https://ik.imagekit.io/<your_imagekit_id>/", "");
        //         await imageKit.deleteFile(publicId);
        //     }catch(deleteErro) {
        //         console.log("Error deleting image from imagekit", deleteErro);
        //     }
        // }

        // delete image from imagekit as well
        if (book.fileId) {
            try {
                await imageKit.deleteFile(book.fileId);
                console.log("Image deleted from ImageKit");
            } catch (deleteError) {
                console.log("Error deleting image from ImageKit", deleteError);
            }
        }


        await book.deleteOne();

        res.json({ message: "Book deleted successfully" });
    }catch(e) {
        console.log("Error deleting book", e);
        res.status(500).json({ message: "internal server error" });
    }
});

export default router;