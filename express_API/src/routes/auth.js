import { compare, hash } from "bcrypt";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { dbPromise } from "../index.js";

export const authRouter = Router();

authRouter.post("/local/register", async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: "Missing username, email or password" });
  }

  const hashedPassword = await hash(password, 10);
  
  dbPromise.then(async (db) => {
    try {
      await db.run("INSERT INTO users (username, email, password) VALUES (?, ?, ?)", [username, email, hashedPassword]);
      const user = await db.get("SELECT * FROM users WHERE email = ?", [email]);
      const token = jwt.sign({ id: user.id, email: user.email }, process.env.SECRET, { expiresIn: '1h' });
      delete user.password;
      res.status(201).json({ ...user, jwt: token });
    } catch(error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  }).catch((error) => {
    console.error("Database connection error:", error);
    res.status(500).json({ error: "Database connection failed" });
  });
});

authRouter.post("/local/", async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    return res.status(400).json({ error: "Missing identifier or password" });
  }

  dbPromise.then(async (db) => {
    try {
      const user = await db.get("SELECT * FROM users WHERE email = ?", [identifier]);
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const passwordMatch = await compare(password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const token = jwt.sign({ id: user.id, email: user.email }, process.env.SECRET, { expiresIn: '1h' });
      delete user.password;

      res.json({ ...user, jwt: token });
    } catch(error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  }).catch((error) => {
    console.error("Database connection error:", error);
    res.status(500).json({ error: "Database connection failed" });
  });
});