const moment = require('moment');
const sqlite3 = require('sqlite3').verbose();
const express = require('express');
const PORT = 9000;
const HOST = '0.0.0.0';
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const db = new sqlite3.Database('./assessment.db', sqlite3.OPEN_READWRITE, (err) => {
    if (err) return console.error(err.message);
})

db.serialize(() => {
    db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, 'orders', (err, row) => {
        if (row === undefined) {
            db.run('CREATE TABLE orders(order_name, dough_start, dough_end, topping_start, topping_end, oven_start, oven_end, serve_start, serve_end, total_time)')
        }
    });
});
const delay = t => new Promise(resolve => setTimeout(resolve, t));

async function start(orders, toppings, res){
    
    
    counter = 0

    const final = []

    const obj = orders.reduce((accumulator, value) => {
        return {...accumulator, [value]: {
            Date: moment(new Date).format("YYYY-MM-DD"),
            Toppings: toppings[value],
            Dough: {
                Start: '',
                End: ''
            },
            Topping: {
                Start: '',
                End: ''
            },
            Oven: {
                Start: '',
                End: ''
            },
            Serve: {
                Start: '',
                End: ''
            },
            Total_Time: ''
        }};
    }, {});

    oven = []
    ovenStatus = "Free"

    myInterval2 = setInterval(()=>{
        ovenCheck(obj, final, res)
    }, 1000)

    orders.forEach((a, index) => {  
        final.push(a)
        if (index % 2 === 0) {
            counter = counter + 1
            delay(7000*(counter-1)).then(() => (getLog(a, "Dough", "Start", obj)));
            delay(7000*counter).then(() => (getLog(a, "Dough", "End", obj), main(obj[orders[index]]["Toppings"], a, obj)));
            orders[index + 1] === undefined ? null : delay(7000*(counter-1)).then(() => (getLog(orders[index + 1], "Dough", "Start", obj)));
            orders[index + 1] === undefined ? null : delay(7000*counter).then(() => (getLog(orders[index + 1], "Dough", "End", obj), main(obj[orders[index+1]]["Toppings"], orders[index + 1], obj)));   
        }
    });
}


function displayReport() {
    const sqlGet = 'SELECT * FROM orders';
    db.all(sqlGet, [], (err, rows) => {
        if (err) return console.error(err.message)
        rows.forEach((row) => {
           console.log(row)
        })
    })
}

async function insert(a, obj) {
    const sql = 'INSERT INTO orders (order_name, dough_start, dough_end, topping_start, topping_end, oven_start, oven_end, serve_start, serve_end, total_time) VALUES (?,?,?,?,?,?,?,?,?,?)';
    db.run(sql, [a, 
        obj[a]['Dough']['Start'], obj[a]['Dough']['End'],
        obj[a]['Topping']['Start'], obj[a]['Topping']['End'],
        obj[a]['Oven']['Start'], obj[a]['Oven']['End'], 
        obj[a]['Serve']['Start'], obj[a]['Serve']['End'], 
        obj[a]['Total_Time']], 
        (err) => {if (err) console.error(err.message)}
    );
}

function getTime(current) {
    return current.toLocaleTimeString()
}

function getLog(element, process, position, obj) {
    obj[element][process][position] = getTime(new Date())
    console.log(element, process, position, getTime(new Date()))
}

function timer(count, element, process, obj) {
    getLog(element, process, "Start", obj)
    return new Promise(resolve => {
    let counter = setInterval(() => {
        count = count - 1;
        if (count < 0) {
        getLog(element, process, "End", obj)
        clearInterval(counter);
        resolve();
        return;
        }
    }, 1000);
    });
}


async function main(x, a, obj) {
    await timer(4 * x.length, a, "Topping", obj) 
    oven.push(a)
}


async function ovenCheck(obj, final, res) {
    if (ovenStatus === "Free") {
        if (oven.length > 0) {
            var a = oven.pop();
            ovenStatus = "Busy"
            await timer(10, a, "Oven", obj);
            ovenStatus = "Free"
            await timer(5, a, "Serve", obj)
            obj[a]['Total_Time'] = `${((new Date(obj[a]["Date"] + "T" +obj[a]['Serve']['End']).getTime()) - (new Date(obj[a]["Date"] + "T" +obj[a]['Dough']['Start']).getTime()))/1000} seconds`
            await insert(a, obj);
            final.pop()
            if (final.length === 0) {
                clearInterval(myInterval2);
                displayReport();
                db.close((err) => {
                    if (err) return console.error(err.message);
                })
                res.status(200).json({});
            }
        } 
    }
}


app.get('/', (req, res) => {
    res.send('server running....')
})

app.post('/add', async (req, res) => {
    userOrders = Object.keys(req.body)
    userToppings = req.body
    await start(userOrders, userToppings, res)
    try {
        
    } catch(err) {
        console.log(err)
        res.send({status: "500", error: err})
    };  
});

app.listen(PORT, HOST)
console.log(`Running on http://${HOST}:${PORT}`);

