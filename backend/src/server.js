const express = require("express");
const cors = require("cors");
const path = require("path");
const dotenv = require("dotenv");
const pool = require("./db");
const initDb = require("./initDb");

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 5001);
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

app.use(
  cors({
    origin: frontendUrl
  })
);
app.use(express.json());
app.use("/images", express.static(path.join(__dirname, "..", "public", "images")));

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, message: "Database connection failed." });
  }
});

app.get("/api/products", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, name, description, price, image_url AS imageUrl, category, inventory_count AS inventoryCount FROM products ORDER BY id DESC"
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "Unable to fetch products." });
  }
});

app.post("/api/orders", async (req, res) => {
  const { customerName, phone, address, items } = req.body;

  if (!customerName || !phone || !address || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "Customer details and cart items are required." });
  }

  const productIds = items.map((item) => item.productId);
  const [products] = await pool.query(
    `SELECT id, name, price, inventory_count AS inventoryCount
     FROM products
     WHERE id IN (${productIds.map(() => "?").join(",")})`,
    productIds
  );

  if (products.length !== items.length) {
    return res.status(400).json({ message: "Some cart items are no longer available." });
  }

  const productMap = new Map(products.map((product) => [product.id, product]));
  let totalAmount = 0;

  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product) {
      return res.status(400).json({ message: "Invalid product in cart." });
    }

    if (item.quantity < 1 || item.quantity > product.inventoryCount) {
      return res.status(400).json({ message: `Insufficient stock for ${product.name}.` });
    }

    totalAmount += Number(product.price) * Number(item.quantity);
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [orderResult] = await connection.query(
      "INSERT INTO orders (customer_name, phone, address, total_amount) VALUES (?, ?, ?, ?)",
      [customerName, phone, address, totalAmount]
    );

    for (const item of items) {
      const product = productMap.get(item.productId);

      await connection.query(
        "INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)",
        [orderResult.insertId, item.productId, item.quantity, product.price]
      );

      await connection.query(
        "UPDATE products SET inventory_count = inventory_count - ? WHERE id = ?",
        [item.quantity, item.productId]
      );
    }

    await connection.commit();

    res.status(201).json({
      message: "Order placed successfully.",
      orderId: orderResult.insertId,
      totalAmount
    });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ message: "Failed to place the order." });
  } finally {
    connection.release();
  }
});

initDb()
  .then(() => {
    app.listen(port, () => {
      console.log(`Backend running on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize database:", error);
    process.exit(1);
  });
