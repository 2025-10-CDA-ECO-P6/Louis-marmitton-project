import jwt from "jsonwebtoken";

export const checkToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const tokenType = authHeader.split(" ")[0];
    if( tokenType !== "Bearer") {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    if(!jwt.verify(token, process.env.SECRET)) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    next();
  } else {
    res.status(401).json({ error: "Unauthorized" });
  }
}