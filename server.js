const express =require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt-nodejs');
const cors = require('cors');
const knex = require('knex');

const db = knex({
    client: 'pg',
    connection: {
        host: process.env.DATABASE_URL,
        ssl: true,
    }
});


const app = express();
app.use(bodyParser.json())
app.use(cors())

app.get('/', (req,res) => {
    res.send('it is working')
}
)

app.post('/signin', (req, res) => {
    db.select('email', 'hash').from('login')
    .where('email', '=', req.body.email)
    .then(data => {
        const isValid = bcrypt.compareSync(req.body.password, data[0].hash);
        if (isValid) {
            return db.select('*').from('users')
            .where('email', '=', req.body.email)
            .then(user => { 
                res.json(user[0])
            })
            .catch(err => res.status(400).json('unable to get user')) 
        } else {
        res.status(400).json('wrong credentials')
        }
    })
    .catch(err => res.status(400).json('Wrong credentials'))
})

app.post('/register', (req, res) => {
    const{ email, name, password } = req.body;
    if (!email || !name || !password) {
        return res.status(400).json('incorrect form submission');
    }
    var hash = bcrypt.hashSync(password);
    db.transaction(trx => {
        trx.insert({
            hash: hash,
            email: email
        })
        .into('login')
        .returning('email')
        .then(loginEmail => {
            return db('users')
            .returning('*')
            .insert({
                email: loginEmail[0],
                name: name,
                joined: new Date()
            }).then(user => {
                res.json(user[0]);
            })
        })
        .then(trx.commit)
        .catch(trx.rollback)
    })

    .catch(err=>res.status(400).json("Unable to Register"))
})

app.get('/profile/:id', (req, res) => {
    const {id} = req.params;
    db.select('*').from('users').where({id})
    .then(user => {
        if (user.length) {
        res.json(user[0])
    }  else {
        res.status(400).json('Not found')
    }
    })
    .catch(err => res.status(400).json('error getting user'))
})

app.put('/image', (req, res) => {
    const { id } = req.body;
    db('users').where('id', '=', id)
    .increment('entries', 1)
    .returning('entries')
    .then(entries => {
        res.json(entries[0]);
    })
    .catch(err => res.status(400).json('Unable to get entries'))
    })

// bcrypt.hash("bacon", null, null, function(err, hash) {
//     // Store hash in your password DB.
// });

// // Load hash from your password DB.
// bcrypt.compare("bacon", hash, function(err, res) {
//     // res == true
// });
// bcrypt.compare("veggies", hash, function(err, res) {
//     // res = false
// });

app.listen(process.env.PORT || 3000, () =>
    console.log('app is running on port')
)

// ----------basic server outline----
// route -> res = this is working
// sign in => POST, respond with success/fail
// register => POST, create new user
// /profile => :userID -> GET = user
// /image ---> PUT, update user score

// app.put('/image', (req, res) => {
//     const { id } = req.body;
//     let found = false;
//     database.users.forEach(user => {
//         if (user.id === id) {
//             found = true;
//             user.entries++
//             return res.json(user.entries);
//         } 
//     })
//     if (!found) {
//         res.status(400).json("User not found")
//     }
// })