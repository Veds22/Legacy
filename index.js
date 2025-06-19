import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import db from "./config/db.js";
import multer from "multer";
import { cloudinary, storage } from "./config/cloudinary.js";


dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const upload = multer({ storage });
// Middleware
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static("public"));
app.use("/static", express.static("public/static"));
app.set("view engine", "ejs");

// Auth Middleware
function authenticateToken(req, res, next) {
  const token = req.cookies?.token || req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).send("Access denied");

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).send("Invalid token");
    req.user = user;
    next();
  });
}

// Routes
app.get("/", (req, res) => {
  const token = req.cookies.token;
  let isLoggedIn = false;

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      isLoggedIn = true;
    } catch (err) {
      isLoggedIn = false;
    }
  }
  res.render("home.ejs", { isLoggedIn });
});

app.get("/login", (req, res) => {
  const token = req.cookies.token;
  if (token) {
    try {
      jwt.verify(token, process.env.JWT_SECRET);
      return res.redirect("/vaults");
    } catch (err) {
      res.clearCookie("token");
    }
  }
  res.render("login.ejs", { isLoggedIn: false });
});

app.get("/register", (req, res) => {
  const token = req.cookies.token;
  if (token) {
    try {
      jwt.verify(token, process.env.JWT_SECRET);
      return res.redirect("/vaults");
    } catch (err) {
      res.clearCookie("token");
    }
  }
  res.render("register.ejs", { isLoggedIn: false });
});

app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [email]);
    if (checkResult.rows.length > 0) return res.send("Email already exists.");

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query("INSERT INTO users (username, email, password) VALUES ($1, $2, $3)", [username, email, hashedPassword]);
    res.redirect("/login");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

app.post("/login", async (req, res) => {
  const { username: email, password } = req.body;

  try {
    const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
    if (result.rows.length === 0) return res.send("User not found");

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.send("Incorrect password");

    const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "1h" });

    res.cookie("token", token, { httpOnly: true, maxAge: 3600000 });
    res.redirect("/vaults");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

app.get("/vaults", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await db.query(
      `SELECT vaults.id AS _id, vaults.name, vaults.description, 
       (SELECT images.image_url 
        FROM images 
        WHERE images.vault_id = vaults.id 
        ORDER BY images.uploaded_at ASC 
        LIMIT 1) as first_image
       FROM vaults 
       WHERE vaults.user_id = $1`,
      [userId]
    );
    res.render("vaults.ejs", { vaults: result.rows, isLoggedIn: true});
  } catch (err) {
    console.error("Error fetching vaults:", err.message);
    res.status(500).send("Error fetching vaults.");
  }
});

app.get("/vaults/create", authenticateToken, (req, res) => {
  res.render("create.ejs", { isLoggedIn: true });
});

app.post("/vaults/create", authenticateToken, async (req, res) => {
  const { name, description } = req.body;
  const userId = req.user.userId;
  try {
    await db.query(
      `INSERT INTO vaults (name, description, user_id) VALUES ($1, $2, $3)`,
      [name, description, userId]
    );
    res.redirect("/vaults");
  } catch (err) {
    console.error("Error creating vault:", err.message);
    res.status(500).send("Could not create vault");
  }
});

app.get("/vaults/:id", authenticateToken, async (req, res) => {
  const vaultId = req.params.id;
  const userId = req.user.userId;

  try {
    // First get vault details
    const vaultResult = await db.query(
      "SELECT name, description FROM vaults WHERE id = $1 AND user_id = $2",
      [vaultId, userId]
    );

    if (vaultResult.rows.length === 0) {
      return res.status(403).send("You don't have permission to view this vault");
    }

    const vault = vaultResult.rows[0];

    // Then get images if any
    const imagesResult = await db.query(
      `SELECT images.image_url AS "imageUrl",
              images.description AS subtitle,
              users.username AS "addedBy",
              TO_CHAR(images.uploaded_at, 'Month DD, YYYY') AS "addedOn"
       FROM images
       JOIN vaults ON images.vault_id = vaults.id
       JOIN users ON vaults.user_id = users.id
       WHERE images.vault_id = $1
       ORDER BY images.uploaded_at DESC`,
      [vaultId]
    );

    res.render("vault.ejs", { 
      cards: imagesResult.rows, 
      vaultId, 
      vault,
      isLoggedIn: true 
    });
  } catch (err) {
    console.error("Error fetching vault:", err.message);
    res.status(500).send("Error loading vault");
  }
});

app.get("/vaults/:id/upload", authenticateToken, async (req, res) => {
  const vaultId = req.params.id;
  const userId = req.user.userId;

  try {
    // Verify user owns the vault
    const vaultCheck = await db.query(
      "SELECT id FROM vaults WHERE id = $1 AND user_id = $2",
      [vaultId, userId]
    );

    if (vaultCheck.rows.length === 0) {
      return res.status(403).send("You don't have permission to upload to this vault");
    }

    res.render("upload.ejs", { vaultId, isLoggedIn: true });
  } catch (err) {
    console.error("Error checking vault:", err.message);
    res.status(500).send("Error accessing vault");
  }
});

app.post(
  "/vaults/:id/upload",
  authenticateToken,
  upload.single("fileInput"),
  async (req, res) => {
    const { description } = req.body;
    const vaultId = req.params.id;
    const userId = req.user.userId;
    try {
      // First verify the vault exists and belongs to the user
      const vaultCheck = await db.query(
        "SELECT id FROM vaults WHERE id = $1 AND user_id = $2",
        [vaultId, userId]
      );

      if (vaultCheck.rows.length === 0) {
        return res.status(403).send("Vault not found or you don't have permission");
      }

      const imageUrl = req.file.path; // Cloudinary URL
      await db.query(
        `INSERT INTO images (vault_id, image_url, description) VALUES ($1, $2, $3)`,
        [vaultId, imageUrl, description]
      );

      res.redirect(`/vaults/${vaultId}`);
    } catch (err) {
      console.error("Image upload error:", err.message);
      res.status(500).send("Failed to upload image");
    }
  }
);

app.delete("/vaults/:id", authenticateToken, async (req, res) => {
  try {
    await db.query("DELETE FROM vaults WHERE id = $1", [req.params.id]);
    res.status(200).send("Vault deleted successfully");
  } catch (error) {
    console.error("Error deleting vault:", error);
    res.status(500).send("Error deleting vault");
  }
});

// Add delete route for images
app.delete("/vaults/:vaultId/delete/:imageId", authenticateToken, async (req, res) => {
  const { vaultId, imageId } = req.params;
  const userId = req.user.id; 

  try {
   
    const vaultResult = await pool.query(
      "SELECT 1 FROM vaults WHERE id = $1 AND user_id = $2",
      [vaultId, userId]
    );

    if (vaultResult.rowCount === 0) {
      return res.status(403).json({ error: "Unauthorized or vault not found." });
    }

   
    const imageResult = await pool.query(
      "SELECT 1 FROM images WHERE id = $1 AND vault_id = $2",
      [imageId, vaultId]
    );

    if (imageResult.rowCount === 0) {
      return res.status(404).json({ error: "Image not found in this vault." });
    }

   
    await pool.query(
      "DELETE FROM images WHERE id = $1 AND vault_id = $2",
      [imageId, vaultId]
    );

    res.status(200).json({ message: "Image deleted from database successfully." });

  } catch (error) {
    console.error("Error deleting image:", error);
    res.status(500).send("Error deleting image");
  }
});


app.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/");
});

app.listen(port, () => {
  console.log(`Server running on port No. ${port}`);
});


// ============= Database Schema =============
// Schema for Vaults and image table 
// each user will have multiple vaults and each vault will have multiple images 
// user 1--n vaults 1--n images 
// CREATE TABLE vaults (
//   id SERIAL PRIMARY KEY,
//   user_id INTEGER NOT NULL,
//   name VARCHAR(100) NOT NULL,
//   description TEXT,
//   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//   FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
// );

// CREATE TABLE images (
//   id SERIAL PRIMARY KEY,
//   vault_id INTEGER NOT NULL,
//   image_url TEXT NOT NULL,
//   description TEXT,
//   uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//   FOREIGN KEY (vault_id) REFERENCES vaults(id) ON DELETE CASCADE
// );

// ADD column for Full Name of user
