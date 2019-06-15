/*Celem projektu jest stworzenie PROSTEGO modułu jakim jest koszyk zakupów w sklepie internetowym. 
Główne założenie aplikacji to stworzenie REST API pozwalające na dodanie, wyświetlanie, zmodyfikowanie 
i usunięcie elementów z koszyka.
    Baza produktów i użytkowników może być ustawiona na sztywno(bez dodatkowego API do ich zarządzania, 
a jedynie pobierana z naszej 'bazy').
    Podczas dodawania elementów do koszyka powinniśmy operować na identyfikatorach produktów oraz użytkownika.
API powinno pozwolić obsługiwać wielu użytkowników i koszyków.

Wymagania na zaliczenie:
1. Podstawą zaliczenia jest wykonanie najprostszego REST API pozwalającego na zarządzanie koszykiem internetowym.
2.(*) Aplikacja powinna pozwolić na dodawanie produktów z poziomu REST API.
3.(*) Dodawanie produktów powinno być zabezpieczone hasłem (middleware z hasłem na sztywno)

Ma to być aplikacja serwerowa w postaci REST API. Interfejs graficzny nie jest wymagany! Tematyka sklepu jak 
i produktów jest dowolna (warzywniak, sklep ze sprzętem komputerowym, itp.)

Ważne!
Przetrzymywanie danych jak i ich struktura zależna jest od programisty! Pełna dowolność w wykorzystaniu bibliotek oraz 
bazy danych. Liczę na pomysłowość i kreatywność!

Zaliczenie odbędzie się na ostatnich zajęciach z NodeJS, czyli 25-26.05.2019.*/

const fs = require("fs");
const express = require("express");
const server = express();
const bodyParser = require("body-parser");

let products = JSON.parse(fs.readFileSync("./database/products.json"));
let users = JSON.parse(fs.readFileSync("./database/users.json"));
let orders = (() => {
  try {
    let result = JSON.parse(fs.readFileSync("./database/orders.json"));
    return result;
  } catch (error) {
    return [];
  }
})();
let shoppingCart = (() => {
  try {
    let cartResult = JSON.parse(fs.readFileSync("./database/cart.json"));
    return cartResult;
  } catch (error) {
    return [];
  }
})();
let loggedUserId = false;
server.use(bodyParser.json());

server.param("id", (req, res, next, value) => {
  if (value) {
    req.params.id = parseInt(value);
  }
  next();
});

server
  .route("/user/:id?")
  .get((req, res) => {
    const { id } = req.params;
    const result = id ? users.find(user => user.id === id) : users;
    if (result) {
      res.send(result);
    } else {
      res.status(404).send();
    }
  })
  .post((req, res) => {
    const lastId = users.reduce(
      (max, user) => (max < user.id ? user.id : max),
      0
    );
    const newUser = {
      id: lastId + 1,
      ...req.body
    };
    users.push(newUser);
    try {
      const newUsers = JSON.stringify(users);
      fs.writeFileSync("./database/users.json", newUsers);
      console.log("users.json succesfuly saved");
    } catch (error) {
      console.log("error during saving the file");
    }
    res.status(201).send(newUser);
  })
  .delete((req, res) => {
    const { id } = req.params;
    users = users.filter(user => user.id !== id);
    try {
      const newUsers = JSON.stringify(users);
      fs.writeFileSync("./database/users.json", newUsers);
      console.log("users.json succesfuly saved");
    } catch (error) {
      console.log("error during saving the file");
    }
    res.send();
  })
  .put((req, res) => {
    const { id } = req.params;
    const userIndex = users.findIndex(user => user.id === id);
    if (userIndex === -1) {
      return res.status(404).send();
    }
    const newUser = {
      id: id,
      ...req.body
    };
    users[userIndex] = newUser;
    try {
      const newUsers = JSON.stringify(users);
      fs.writeFileSync("./database/users.json", newUsers);
      console.log("users.json succesfuly saved");
    } catch (error) {
      console.log("error during saving the file");
    }
    res.status(201).send(newUser);
  });

server.post("/login/:id?", (req, res) => {
  const { logout } = req.query;
  if (logout) {
    loggedUserId = false;
    res.status(201).send(`Logged out.`);
    //jeśli logout jest true, to użytkownik wylogowany;
  } else {
    const { id } = req.params;
    let login;
    try {
      login = users.find(user => user.id == id);
      loggedUserId = id;
      res.status(201).send(`Logged as: ${login.username}.`);
      //jeśli w users.json jest podane id to użytkownik się zaloguje
    } catch (error) {
      res.status(404).send();
    }
  }
});

//http://localhost:4000/login/1 - zalogowanie użytkownika z id 1;
//http://localhost:4000/login?logout=true - wylogowanie użytkownika;

server.post("/buy", (req, res) => {
  if (loggedUserId && shoppingCart.length > 0) {
    const lastId = orders.reduce(
      (max, order) => (max < order.id ? order.id : max),
      0
    );
    const newOrder = {
      id: lastId + 1,
      userId: loggedUserId,
      order: shoppingCart
    };
    orders.push(newOrder);
    shoppingCart = [];
    try {
      let newOrders = JSON.stringify(orders);
      fs.writeFileSync("./database/orders.json", newOrders);
      console.log("orders.json succesfuly saved");
    } catch (error) {
      console.log("error during saving orders");
    }
    res.status(201).send(newOrder);
    //jeśi użytkownik jest zalogowany a w koszyku są produkty,
    //koszyk z id użytkownika zostanie wypchnięty i zapisany w orders.json
  } else {
    res.status(404).send();
  }
});
//potwierdzanie zakupu;
//http://localhost:4000/buy

server
  .route("/shopping-cart/:id?")
  .get((req, res) => {
    const { id } = req.params;
    const result = id
      ? shoppingCart.find(product => product.id === +id)
      : shoppingCart;
    if (result) {
      res.send(result);
    } else {
      res.status(404).send();
    }
  })
  //wyświetlanie koszyka;
  //http://localhost:4000/shopping-cart - wyświetla cały;
  //http://localhost:4000/shopping-cart/1 - wyświetla id danej pozycji koszyka;
  .post((req, res) => {
    const { id } = req.params;
    const { amount } = req.query;
    const lastId = shoppingCart.reduce(
      (max, product) => (max < product.id ? product.id : max),
      0
    );

    const addToCart = {
      id: lastId + 1,
      productId: products.find(product => product.id == id),
      amount: (amount => (amount ? amount : 1))(amount)
    };
    if (addToCart.productId) {
      addToCart.productId = id;
      shoppingCart.push(addToCart);
      try {
        const saveCart = JSON.stringify(shoppingCart);
        fs.writeFileSync("./database/cart.json", saveCart);
        console.log("cart.json succesfuly saved");
      } catch (error) {
        console.log("error during saving the file");
      }
      res.status(201).send(addToCart);
    } else {
      res.send(404).send();
    }
  })
  //dodawanie produktu do koszyka (po id produktów);
  //http://localhost:4000/shopping-cart/1 - 1 to id produktu z products.json który dodajemy do koszyka;
  .delete((req, res) => {
    const { id } = req.params;
    shoppingCart = shoppingCart.filter(product => product.id != id);
    try {
      const saveCart = JSON.stringify(shoppingCart);
      fs.writeFileSync("./database/cart.json", saveCart);
      console.log("cart.json succesfuly saved");
    } catch (error) {
      console.log("error during saving the file");
    }
    res.send();
  })
  //usuwanie produktu z koszyka (po id koszyka);
  //http://localhost:4000/shopping-cart/1 - 1 to id elementu koszyka, który ma zostać usunięty;
  .put((req, res) => {
    const { id } = req.params;
    const { newId, amount } = req.query;
    const cartIndex = shoppingCart.findIndex(product => product.id == newId);
    if (cartIndex === -1) {
      return res.status(404).send();
    }
    const addToCart = {
      id: newId,
      productId: products.find(product => product.id == id),
      amount: (amount => (amount ? amount : 1))(amount)
    };
    if (addToCart.productId) {
      addToCart.productId = id;
      shoppingCart[cartIndex] = addToCart;
      try {
        const saveCart = JSON.stringify(shoppingCart);
        fs.writeFileSync("./database/cart.json", saveCart);
        console.log("cart.json succesfuly saved");
      } catch (error) {
        console.log("error during saving the file");
      }
      res.status(201).send(addToCart);
    } else {
      res.send(404).send();
    }
  });
//zamiana produktu w koszyku;
//http://localhost:4000/shopping-cart/1 - 1 to id elementu koszyka, do zamiany;
//http://localhost:4000/shopping-cart/3?amount=2&newId=1 - 3 to id produktu z products.json, amount=2 - ilość,
//a newId=1 miejsce na które wskakuje nowy produkt; jak nie ma podanego amount, przyjmuje wartość 1;

const password = (req, res, next) => {
  if (req.headers["password"] === "testpassword") {
    next();
  } else {
    res.status(401).send("incorect");
  }
};
//middleware z hasłem do autoryzacji dodawania nowych produktów do products.json;

server
  .route("/products/:id?")
  .get((req, res) => {
    const { id } = req.params;
    const result = id ? products.find(product => product.id === +id) : products;
    if (result) {
      res.send(result);
    } else {
      res.status(404).send();
    }
  })
  //wyświetlanie listy produktów z tablicy products;
  //http://localhost:4000/products - wyświetla całą zawartość products.json;
  //http://localhost:4000/products/1 - wyświetla products z id 1;
  .post(password, (req, res) => {
    const lastId = products.reduce(
      (max, product) => (max < product.id ? product.id : max),
      0
    );
    const newProduct = {
      id: lastId + 1,
      ...req.body
    };
    products.push(newProduct);
    try {
      const newProducts = JSON.stringify(products);
      fs.writeFileSync("./database/products.json", newProducts);
      console.log("products.json succesfuly saved");
    } catch (error) {
      console.log("error during saving the file");
    }
    res.status(201).send(newProduct);
  });
//dodawanie nowego produktu do tablicy products, wymaga podania hasła w nagłówku;
//http://localhost:4000/products
//header - key: password, value: testpassword;
//body - {"productName": "nazwa_produktu"};

server.listen(4000, () => console.log("Welcome to our shop"));
