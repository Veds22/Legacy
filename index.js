import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;
const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "Legacy",
  password: "admin",
  port: 5432,
});
db.connect();

// Middleware
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use('/static', express.static('public/static'));
app.set('view engine', 'ejs');

// ============= Static Routes =============
app.get("/", (req, res) => {
  res.render("home.ejs");
});

// ============= Authentication Routes =============
app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.get("/register", (req, res) => {
  res.render("register.ejs");
});

app.post("/register", async (req, res) => {
  const email = req.body.username;
  const password = req.body.password;

  try {
    const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (checkResult.rows.length > 0) {
      res.send("Email already exists. Try logging in.");
    } else {
      const result = await db.query(
        "INSERT INTO users (email, password) VALUES ($1, $2)",
        [email, password]
      );
      console.log(result);
      res.render("secrets.ejs");
    }
  } catch (err) {
    console.log(err);
  }
});

app.post("/login", async (req, res) => {
  const email = req.body.username;
  const password = req.body.password;

  try {
    const result = await db.query("SELECT * FROM users WHERE username = $1", [
      email,
    ]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      const storedPassword = user.password;

      if (password === storedPassword) {
        res.render("secrets.ejs");
      } else {
        res.send("Incorrect Password");
      }
    } else {
      res.send("User not found");
    }
  } catch (err) {
    console.log(err);
  }
});

// ============= Vault Routes =============
app.get("/vaults", async (req, res) => {
  try {
    const userId = 1;

    const result = await db.query(
      `
      SELECT 
        id AS _id, 
        name, 
        description, 
        image_url AS "imageUrl" 
      FROM vaults
      WHERE user_id = $1
      `,
      [userId]
    );
    console.log(result.rows);

    res.render("vaults.ejs", { vaults: result.rows });
  } catch (err) {
    console.error("Error fetching vaults:", err.message);
    res.status(500).send("Error fetching vaults from database.");
  }
});

app.get('/vaults/create', (req, res) => {
  res.render('create.ejs');
});

app.post('/vaults/create', async (req, res) => {
  try {
    console.log('Request Body:', req.body);
    const { name, description, visibility } = req.body;
    
    if (!name || !visibility) {
      return res.status(400).send('Name and visibility are required');
    }

    const result = await db.query(
      "INSERT INTO vaults (user_id, name, description) VALUES ($1, $2, $3) RETURNING id",
      [1, name, description]
    );

    res.redirect('/vaults');
  } catch (error) {
    console.error('Error processing form:', error);
    res.status(500).send('Error processing form');
  }
});

app.get('/vaults/:id', async (req, res) => {
  const vaultId = req.params.id;

  try {
    const result = await db.query(`
      SELECT 
        images.image_url AS "imageUrl",
        images.description AS subtitle,
        users.name AS "addedBy",
        TO_CHAR(images.uploaded_at, 'Month DD, YYYY') AS "addedOn"
      FROM images
      JOIN vaults ON images.vault_id = vaults.id
      JOIN users ON vaults.user_id = users.id
      WHERE images.vault_id = $1
      ORDER BY images.uploaded_at DESC
    `, [vaultId]);

    res.render('vault.ejs', { cards: result.rows, vaultId });
  } catch (err) {
    console.error('Error fetching images for vault:', err.message);
    res.status(500).send('Error loading vault images');
  }
});

app.get("/vaults/:id/upload", (req, res) => {
  res.render('upload.ejs');
});

app.post('/vaults/:id/upload', async(req, res) => {
  return null
})

app.delete('/vaults/:id', async (req, res) => {
  try {
    const result = await db.query("DELETE FROM vaults WHERE id = $1", [req.params.id]);
    res.status(200).send('Vault deleted successfully');
  } catch (error) {
    console.error('Error deleting vault:', error);
    res.status(500).send('Error deleting vault');
  }
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

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});