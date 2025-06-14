import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;
const db =new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "Legacy",
  password: "yash",
  port: 5432,
});
//db.connect();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use('/static', express.static('public/static'));
app.set('view engine', 'ejs');

app.get("/", (req, res) => {
  res.render("home.ejs");
});

app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.get("/register", (req, res) => {
  res.render("register.ejs");
});

app.get("/vaults", (req, res) => {

  // TESTED WITH DUMMY DATA
  // Retreive vaults of a user and displays it
  // Add logic to retrieve data from db and parse it to vaults.ejs

  res.render('vaults.ejs', { vaults: [{
    _id: '1',
    name: 'yash',
    description: "Topper",
    imageUrl: "https://images.pexels.com/photos/674010/pexels-photo-674010.jpeg?cs=srgb&dl=pexels-anjana-c-169994-674010.jpg&fm=jpg"
  },
  {
    _id: '2',
    name: 'yash',
    description: "Rajaji",
    imageUrl: "https://images.pexels.com/photos/674010/pexels-photo-674010.jpeg?cs=srgb&dl=pexels-anjana-c-169994-674010.jpg&fm=jpg"
  },
  {
    _id: '3',
    name: "yash",
    description: "Interdimensional Conqueror",
    imageUrl: "https://images.pexels.com/photos/674010/pexels-photo-674010.jpeg?cs=srgb&dl=pexels-anjana-c-169994-674010.jpg&fm=jpg"
  },
  {
    _id: '4',
    name: 'yash',
    description: "Team Leader",
    imageUrl: "https://images.pexels.com/photos/674010/pexels-photo-674010.jpeg?cs=srgb&dl=pexels-anjana-c-169994-674010.jpg&fm=jpg"
  }]
 });
});

app.get('/vaults/:id', (req, res) => {

  // TESTED with Dummy Data
  // add logic to retreive data from db for images and parse it to vault.ejs

  const cards = [
    {
      imageUrl: 'https://images.pexels.com/photos/674010/pexels-photo-674010.jpeg',
      title: 'Sunset View',
      subtitle: 'Beautiful sunset by the beach.',
      addedBy: 'Alice Smith',
      addedOn: 'June 1, 2025'
    },
    {
      imageUrl: 'https://images.pexels.com/photos/674010/pexels-photo-674010.jpeg',
      title: 'Mountain Peaks',
      subtitle: 'Snowy mountains during sunrise.',
      addedBy: 'Bob Stone',
      addedOn: 'June 3, 2025'
    },
    {
      imageUrl: 'https://images.pexels.com/photos/674010/pexels-photo-674010.jpeg',
      title: 'City Lights',
      subtitle: 'Night skyline glowing.',
      addedBy: 'Carla West',
      addedOn: 'June 5, 2025'
    },
    {
      imageUrl: 'https://images.pexels.com/photos/674010/pexels-photo-674010.jpeg',
      title: 'Forest Trail',
      subtitle: 'A walk through the woods.',
      addedBy: 'David King',
      addedOn: 'June 7, 2025'
    },
    {
      imageUrl: 'https://images.pexels.com/photos/674010/pexels-photo-674010.jpeg',
      title: 'Ocean Horizon',
      subtitle: 'Endless waves and breeze.',
      addedBy: 'Ella Rae',
      addedOn: 'June 9, 2025'
    },
    {
      imageUrl: 'https://images.pexels.com/photos/674010/pexels-photo-674010.jpeg',
      title: 'Golden Fields',
      subtitle: 'Sunshine over farmland.',
      addedBy: 'Frank Lane',
      addedOn: 'June 11, 2025'
    }
  ]

  res.render('vault.ejs', { cards })
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

app.delete('/vaults/:id', (req, res) => {
  // In a real application, you would delete the vault from the database
  // Added by ai by itself to be implemented later

  res.status(200).send('Vault deleted successfully');
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});