const express = require('express');
const { program } = require('commander');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");

/* =======================
   CLI (Commander)
======================= */
program
  .requiredOption('-H, --host <host>')
  .requiredOption('-p, --port <port>')
  .requiredOption('-c, --cache <cache>');

program.parse();

const options = program.opts();

/* =======================
   Folders
======================= */
if (!fs.existsSync(options.cache)) fs.mkdirSync(options.cache);
if (!fs.existsSync('photos')) fs.mkdirSync('photos');

/* =======================
   App
======================= */
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =======================
   Upload (Multer)
======================= */
const upload = multer({ dest: 'photos/' });

/* =======================
   In-memory DB
======================= */
let inventory = [];
let nextId = 1;

/* =======================
   Swagger config
======================= */
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Inventory API",
      version: "1.0.0",
      description: "Lab 6 Inventory Service"
    },
    servers: [
      {
        url: `http://${options.host}:${options.port}`
      }
    ]
  },
  apis: [__filename]
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/* =======================
   HTML Forms
======================= */
app.get('/RegisterForm.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'RegisterForm.html'));
});

app.get('/SearchForm.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'SearchForm.html'));
});

/* =======================
   REGISTER
======================= */
/**
 * @openapi
 * /register:
 *   post:
 *     summary: Register item
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - inventory_name
 *             properties:
 *               inventory_name:
 *                 type: string
 *               description:
 *                 type: string
 *               photo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Created
 *       400:
 *         description: Missing name
 */
app.post('/register', upload.single('photo'), (req, res) => {
  if (!req.body.inventory_name) {
    return res.status(400).send("Name required");
  }

  const item = {
    id: nextId++,
    name: req.body.inventory_name,
    description: req.body.description || "",
    photo: req.file ? req.file.filename : null
  };

  inventory.push(item);

  res.status(201).json(item);
});

/* =======================
   GET ALL
======================= */
/**
 * @openapi
 * /inventory:
 *   get:
 *     summary: Get all items
 *     responses:
 *       200:
 *         description: OK
 */
app.get('/inventory', (req, res) => {
  res.json(inventory);
});

/* =======================
   GET ONE
======================= */
/**
 * @openapi
 * /inventory/{id}:
 *   get:
 *     summary: Get item by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *     responses:
 *       200:
 *         description: OK
 *       404:
 *         description: Not found
 */
app.get('/inventory/:id', (req, res) => {
  const item = inventory.find(x => x.id == req.params.id);
  if (!item) return res.sendStatus(404);
  res.json(item);
});

/* =======================
   UPDATE
======================= */
/**
 * @openapi
 * /inventory/{id}:
 *   put:
 *     summary: Update item
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Updated
 *       404:
 *         description: Not found
 */
app.put('/inventory/:id', (req, res) => {
  const item = inventory.find(x => x.id == req.params.id);
  if (!item) return res.sendStatus(404);

  if (req.body.name) item.name = req.body.name;
  if (req.body.description) item.description = req.body.description;

  res.json(item);
});

/* =======================
   DELETE
======================= */
/**
 * @openapi
 * /inventory/{id}:
 *   delete:
 *     summary: Delete item
 *     responses:
 *       200:
 *         description: Deleted
 *       404:
 *         description: Not found
 */
app.delete('/inventory/:id', (req, res) => {
  const index = inventory.findIndex(x => x.id == req.params.id);
  if (index === -1) return res.sendStatus(404);

  inventory.splice(index, 1);
  res.sendStatus(200);
});

/* =======================
   GET PHOTO
======================= */
/**
 * @openapi
 * /inventory/{id}/photo:
 *   get:
 *     summary: Get photo
 *     responses:
 *       200:
 *         description: Image
 *         content:
 *           image/jpeg:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Not found
 */
app.get('/inventory/:id/photo', (req, res) => {
  const item = inventory.find(x => x.id == req.params.id);
  if (!item || !item.photo) return res.sendStatus(404);

  res.sendFile(path.join(__dirname, 'photos', item.photo));
});

/* =======================
   UPDATE PHOTO
======================= */
app.put('/inventory/:id/photo', upload.single('photo'), (req, res) => {
  const item = inventory.find(x => x.id == req.params.id);
  if (!item) return res.sendStatus(404);

  item.photo = req.file.filename;
  res.sendStatus(200);
});

/* =======================
   SEARCH
======================= */
/**
 * @openapi
 * /search:
 *   post:
 *     summary: Search item
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Found
 *       404:
 *         description: Not found
 */
app.post('/search', (req, res) => {
  const item = inventory.find(x => x.id == req.body.id);
  if (!item) return res.sendStatus(404);

  let result = { ...item };

  if (req.body.has_photo) {
    result.photoLink = `/inventory/${item.id}/photo`;
  }

  res.json(result);
});

/* =======================
   405 handler
======================= */
app.use((req, res) => {
  res.status(405).send("Method not allowed");
});

/* =======================
   START SERVER
======================= */
app.listen(options.port, options.host, () => {
  console.log(`Server: http://${options.host}:${options.port}`);
  console.log(`Swagger: http://${options.host}:${options.port}/api-docs`);
});