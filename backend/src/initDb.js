const fs = require("fs/promises");
const path = require("path");
const pool = require("./db");

const seedProducts = [
  {
    name: "Saffron Karak Kit",
    description: "A house blend for rich karak chai with saffron, cardamom, and premium tea leaves.",
    price: 22,
    image_url: "/images/saffron-karak.svg",
    category: "Tea Essentials",
    inventory_count: 18
  },
  {
    name: "Date & Pistachio Box",
    description: "Soft premium dates filled with pistachio cream, boxed for gifting or evening gatherings.",
    price: 34,
    image_url: "/images/date-pistachio.svg",
    category: "Snacks",
    inventory_count: 12
  },
  {
    name: "Spice Pantry Set",
    description: "A ready-to-cook collection of cumin, turmeric, chili, and garam masala for daily meals.",
    price: 28,
    image_url: "/images/spice-pantry.svg",
    category: "Pantry",
    inventory_count: 15
  },
  {
    name: "Olive Soap Trio",
    description: "Gentle olive oil soap bars with a clean herbal scent for everyday home care.",
    price: 19,
    image_url: "/images/olive-soap.svg",
    category: "Home Care",
    inventory_count: 20
  }
];

async function initDb() {
  const schemaPath = path.join(__dirname, "..", "sql", "schema.sql");
  const schema = await fs.readFile(schemaPath, "utf8");

  for (const statement of schema.split(";")) {
    const trimmed = statement.trim();
    if (trimmed) {
      await pool.query(trimmed);
    }
  }

  const [rows] = await pool.query("SELECT COUNT(*) AS count FROM products");
  if (rows[0].count === 0) {
    const insertSql = `
      INSERT INTO products (name, description, price, image_url, category, inventory_count)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    for (const product of seedProducts) {
      await pool.query(insertSql, [
        product.name,
        product.description,
        product.price,
        product.image_url,
        product.category,
        product.inventory_count
      ]);
    }
  }
}

module.exports = initDb;
