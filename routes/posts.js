const express = require("express");
const router = express.Router();
const { auth } = require("../utils");
const { check, validationResult } = require("express-validator");
const User = require("../models/User");
const Post = require("../models/Post");

/*
1. POST /posts
2. GET /posts
3. GET /posts/:id
4. DELETE /posts/:id
5. PUT /posts/like/:id
6. PUT /posts/unlike/:id
7. POST /posts/comment/:id
8. DELETE /posts/comment/:id/:comment_id
*/

router.post(
  "/",
  auth,
  check("text", "Text is required").notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = await User.findById(req.user.id).select("-password");

      const newPost = new Post({
        text: req.body.text,
        name: user.name,
        user: req.user.id,
      });

      const post = await newPost.save();
      res.json(post);
    } catch (err) {
      console.error(err.message);
      return res.status(500).send(err.message);
    }
  }
);

router.get("/", auth, async (req, res) => {
  try {
    const posts = await Post.find().sort({ date: -1 });
    res.json(posts);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error " + err.message);
  }
});

router.get("/:id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ msg: "Post not found" });
    }

    if (post.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: "User is not authorized" });
    }

    res.json(post);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error " + err.message);
  }
});

router.patch(
  "/:id",
  auth,
  check("text", "Text is required").notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const post = await Post.findById(req.params.id);
      if (!post) {
        return res.status(404).json({ msg: "Post not found" });
      }
      if (post.user.toString() !== req.user.id) {
        return res.status(401).json({ msg: "User is not authorized" });
      }

      if (post.text !== req.body.text) {
        await Post.findByIdAndUpdate(req.params.id, {
          $set: { text: req.body.text },
        });
      }

      return res.json(req.body.text);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error " + err.message);
    }
  }
);

router.patch("/like/:id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (post.likes.some((like) => like.user.toString() === req.user.id)) {
      return res.status(400).json({ msg: "Post already liked" });
    }

    post.likes.unshift({ user: req.user.id });

    // await post.save();
    await Post.findOneAndUpdate(
      { _id: req.params.id },
      { likes: post.likes },
      { new: true }
    );

    return res.json(post.likes);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error " + err.message);
  }
});

router.patch("/remove_like/:id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post.likes.some((like) => like.user.toString() === req.user.id)) {
      return res
        .status(400)
        .json({ msg: "User has not liked the post previously!" });
    }

    post.likes = post.likes.filter(
      (like) => like.user.toString() !== req.user.id
    );

    // await post.save();
    await Post.findOneAndUpdate(
      { _id: req.params.id },
      { likes: post.likes },
      { new: true }
    );

    return res.json(post.likes);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error " + err.message);
  }
});

router.patch("/dislike/:id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (
      post.dislikes.some((dislike) => dislike.user.toString() === req.user.id)
    ) {
      return res.status(400).json({ msg: "Post already disliked" });
    }

    post.dislikes.unshift({ user: req.user.id });

    // await post.save();
    await Post.findOneAndUpdate(
      { _id: req.params.id },
      { dislikes: post.dislikes },
      { new: true }
    );

    return res.json(post.dislikes);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error " + err.message);
  }
});

router.patch("/remove_dislike/:id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (
      !post.dislikes.some((dislike) => dislike.user.toString() === req.user.id)
    ) {
      return res
        .status(400)
        .json({ msg: "User has not disliked the post previously!" });
    }

    post.dislikes = post.dislikes.filter(
      (dislike) => dislike.user.toString() !== req.user.id
    );

    // await post.save();
    await Post.findOneAndUpdate(
      { _id: req.params.id },
      { dislikes: post.dislikes },
      { new: true }
    );

    return res.json(post.dislikes);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error " + err.message);
  }
});

router.post(
  "/comment/:id",
  auth,
  check("text", "Text is required").notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = await User.findById(req.user.id).select("-password");
      const post = await Post.findById(req.params.id);

      const newComment = {
        text: req.body.text,
        name: user.name,
        user: req.user.id,
      };

      post.comments.unshift(newComment);

      await post.save();

      res.json(post.comments);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error " + err.message);
    }
  }
);

router.patch(
  "/:postId/:commentId",
  auth,
  check("text", "Text is required").notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const post = await Post.findById(req.params.postId);
      if (!post) {
        return res.status(404).json({ msg: "Post not found" });
      }

      const comment = post.comments.find((comment) => {
        return comment.id === req.params.commentId;
      });

      if (!comment) {
        return res.status(404).json({ msg: "Comment not found" });
      }
      if (post.user.toString() !== req.user.id) {
        return res.status(401).json({ msg: "User is not authorized" });
      }

      if (comment.text !== req.body.text) {
        comment.text = req.body.text;

        await Post.findByIdAndUpdate(req.params.id, {
          $set: { comments: post.comments },
        });

        await post.save();
      }

      return res.json(comment.text);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error " + err.message);
    }
  }
);

router.patch("/comment_like/:id/:comment_id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    const comment = post.comments.find((comment) => {
      return comment.id === req.params.comment_id;
    });

    if (comment.likes.some((like) => like.user.toString() === req.user.id)) {
      return res.status(400).json({ msg: "Comment already liked" });
    }

    comment.likes.unshift({ user: req.user.id });

    await Post.findByIdAndUpdate(
      req.params.id,
      { $set: { comments: post.comments } },
      { new: true }
    );
    // await post.save();

    return res.json(comment.likes);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error " + err.message);
  }
});

router.patch("/remove_comment_like/:id/:comment_id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    const comment = post.comments.find((comment) => {
      return comment.id === req.params.comment_id;
    });

    const userLikedComment = comment.likes.find(
      (like) => like.user.toString() === req.user.id
    );
    if (!userLikedComment) {
      return res
        .status(400)
        .json({ msg: "User has not liked the comment previously!" });
    }

    comment.likes = comment.likes.filter(
      (like) => like.user.toString() !== req.user.id
    );

    await Post.findByIdAndUpdate(
      req.params.id,
      { $set: { comments: post.comments } },
      { new: true }
    );
    await post.save();

    return res.json(comment.likes);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error " + err.message);
  }
});

router.patch("/comment_dislike/:id/:comment_id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    const comment = post.comments.find((comment) => {
      return comment.id === req.params.comment_id;
    });

    if (
      comment.dislikes.some(
        (dislike) => dislike.user.toString() === req.user.id
      )
    ) {
      return res.status(400).json({ msg: "Comment already disliked" });
    }

    comment.dislikes.unshift({ user: req.user.id });

    await Post.findByIdAndUpdate(
      req.params.id,
      { $set: { comments: post.comments } },
      { new: true }
    );
    // await post.save();

    return res.json(comment.dislikes);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error " + err.message);
  }
});

router.patch(
  "/remove_comment_dislike/:id/:comment_id",
  auth,
  async (req, res) => {
    try {
      const post = await Post.findById(req.params.id);
      const comment = post.comments.find((comment) => {
        return comment.id === req.params.comment_id;
      });

      if (
        !comment.dislikes.some(
          (dislike) => dislike.user.toString() === req.user.id
        )
      ) {
        return res
          .status(400)
          .json({ msg: "User has not disliked the comment previously!" });
      }

      comment.dislikes = comment.dislikes.filter(
        (dislike) => dislike.user.toString() !== req.user.id
      );

      await Post.findByIdAndUpdate(
        req.params.id,
        { $set: { comments: post.comments } },
        { new: true }
      );
      await post.save();

      return res.json(comment.dislikes);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error " + err.message);
    }
  }
);

router.delete("/comment/:id/:comment_id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    const comment = post.comments.find((comment) => {
      return comment.id === req.params.comment_id;
    });

    if (!comment) {
      return res.status(404).json({ msg: "Comment does not exist" });
    }

    if (comment.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: "User is not authorized" });
    }

    post.comments = post.comments.filter((comment) => {
      return comment.id !== req.params.comment_id;
    });

    await post.save();
    return res.json(post.comments);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error " + err.message);
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ msg: "Post not found" });
    }

    if (post.user.toString() !== req.user.id) {
      return res
        .status(401)
        .json({ msg: "User is not authorized to remove this post" });
    }

    await post.remove();

    res.json({ msg: "Post is removed" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error " + err.message);
  }
});

module.exports = router;
