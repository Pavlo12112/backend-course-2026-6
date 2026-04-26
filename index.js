const express = require('express');
const { program } = require('commander');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

program
.requiredOption('-h, --host <host>')
.requiredOption('-p, --port <port>')
.requiredOption('-c, --cache <cache>');

program.parse();

const options = program.opts();

if (!fs.existsSync(options.cache)) fs.mkdirSync(options.cache);
if (!fs.existsSync('photos')) fs.mkdirSync('photos');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const upload = multer({ dest: 'photos/' });

let inventory = [];
let nextId = 1;

/* HTML */

app.get('/RegisterForm.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'RegisterForm.html'));
});

app.get('/SearchForm.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'SearchForm.html'));
});

/* REGISTER */

app.post('/register', upload.single('photo'), (req, res) => {

    if (!req.body.inventory_name) {
        return res.status(400).send("Name required");
    }

    const item = {
        id: nextId++,
        name: req.body.inventory_name,
        description: req.body.description,
        photo: req.file ? req.file.filename : null
    };

    inventory.push(item);

    res.status(201).json(item);
});

/* GET ALL */

app.get('/inventory', (req, res) => {
    res.json(inventory);
});

/* GET ONE */

app.get('/inventory/:id', (req, res) => {

    const item = inventory.find(x => x.id == req.params.id);

    if (!item) return res.sendStatus(404);

    res.json(item);
});

/* UPDATE */

app.put('/inventory/:id', (req, res) => {

    const item = inventory.find(x => x.id == req.params.id);

    if (!item) return res.sendStatus(404);

    if (req.body.name) item.name = req.body.name;
    if (req.body.description) item.description = req.body.description;

    res.json(item);
});

/* DELETE */

app.delete('/inventory/:id', (req, res) => {

    const index = inventory.findIndex(x => x.id == req.params.id);

    if (index === -1) return res.sendStatus(404);

    inventory.splice(index, 1);

    res.sendStatus(200);
});

/* PHOTO */

app.get('/inventory/:id/photo', (req, res) => {

    const item = inventory.find(x => x.id == req.params.id);

    if (!item || !item.photo) return res.sendStatus(404);

    res.sendFile(path.join(__dirname, 'photos', item.photo));
});

app.put('/inventory/:id/photo', upload.single('photo'), (req, res) => {

    const item = inventory.find(x => x.id == req.params.id);

    if (!item) return res.sendStatus(404);

    item.photo = req.file.filename;

    res.sendStatus(200);
});

/* SEARCH */

app.post('/search', (req, res) => {

    const item = inventory.find(x => x.id == req.body.id);

    if (!item) return res.sendStatus(404);

    let result = item;

    if (req.body.has_photo) {
        result.photoLink = `/inventory/${item.id}/photo`;
    }

    res.json(result);
});

/* 405 */

app.use((req, res) => {
    res.status(405).send("Method not allowed");
});

/* START */

app.listen(options.port, options.host, () => {
    console.log(`Server started`);
});