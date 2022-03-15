var express = require("express");
var router = express.Router();
var moment = require("moment");

const bcrypt = require("bcrypt");
const { DatabaseError } = require("pg");
const saltRounds = 10;

var userIn = false;
var userRoll = "none";

function isLoggedIn(req, res, next) {
  if (req.session.user) {
    next();
    // kalau ada user nya maka boleh lanjut
  } else {
    res.redirect("/");
    // kalau ga ada ditendang ke yg awal awal
  }
}

function isAdmin(req, res, next) {
  if (req.session.user) {
    if (req.session.user.roll == "admin") {
      next();
      // kalau ada user nya maka boleh lanjut
    } else {
      console.log("Bukan Admin");
      res.redirect("/");
    }
  } else {
    console.log(`Tidak ada sesi`);
    res.redirect("/");
    // kalau ga ada ditendang ke yg awal awal
  }
}
/* GET home page. */

module.exports = function (db) {
  router.get("/", isAdmin, async function (req, res, next) {
    console.log(`Masuk router.get / di users.js`);
    try {
      const field = ["email", "password", "fullname", "roll"];

      const sortBy = field.includes(req.query.sortBy) ? req.query.sortBy : "id";
      const sortMode = req.query.sortMode === "desc" ? "desc" : "asc";
      const url =
        req.url == "/"
          ? "/users?page=1&sortBy=id&sortMode=asc"
          : `/users${req.url}`;

      req.query.sortBy = sortBy;
      req.query.sortMode = sortMode;

      const { emailcheck, email, fullnamecheck, fullname, rollcheck, roll } =
        req.query;

      let params = [];
      let values = [];
      let count = 1;

      if (emailcheck && email) {
        params.push(`email ilike '%' || $${count++} || '%'`);
        values.push(email);
      }
      if (fullnamecheck && fullname) {
        params.push(`fullname ilike '%' || $${count++} || '%'`);
        values.push(fullname);
      }
      if (rollcheck && roll) {
        params.push(`roll =$${count++}`);
        values.push(roll);
      }

      const page = req.query.page || 1;
      const row = 3;
      const offset = (page - 1) * row;

      let sql = "select count(*) as total from users";
      if (params.length > 0) {
        sql += ` where ${params.join(" and")}`;
      }

      const totalResult = await db.query(sql, values);
      const pages = Math.ceil(totalResult.rows[0].total / row);

      sql = `select * from users`;
      if (params.length > 0) {
        sql += ` where ${params.join(" and ")}`;
      }

      sql += ` order by ${sortBy} ${sortMode} limit ${row} offset ${offset}`;

      const data = await db.query(sql, values);

      res.render("users/list", {
        title: "Users ULX",
        data: data.rows,
        moment,
        pagination: {
          page: Number(page),
          pages,
          url,
        },
        successMessage: req.flash("successMessage"),
        errorMessage: req.flash("errorMessage"),
        user: req.session.user,
        query: req.query,
      });
    } catch (err) {
      console.log(err.stack);
    }
  });

  router.get("/add", async function (req, res, next) {
    console.log(`Masuk router.get /add di users.js`);
    res.render("users/form", {
      title: "add",
      data: {},
      successMessage: req.flash("successMessage"),
      errorMessage: req.flash("errorMessage"),
      moment,
    });
  });

  router.post("/add", async function (req, res, next) {
    console.log(`Masuk router.post /add di users.js`);
    try {
      // const { email, password, fullname, roll } = req.body;
      const { email, password, fullname, roll } = req.body;
      bcrypt.hash(password, saltRounds, async function (err, hash) {
        const sql =
          "insert into users(email, password, fullname, roll) values ($1,$2,$3,$4)";
        const data = await db.query(sql, [email, hash, fullname, roll]);
        res.redirect("/users");
      });
    } catch (err) {
      console.log(err.stack);
    }
  });

  router.get("/edit/:id", async function (req, res, next) {
    console.log(`Masuk router.get /edit/:id di users.js`);
    try {
      const sql = "select * from users where id=$1";
      const data = await db.query(sql, [req.params.id]);
      if (data.rows.length > 0) {
        res.render("users/form", {
          title: "edit",
          successMessage: req.flash("successMessage"),
          errorMessage: req.flash("errorMessage"),
          data: data.rows[0],
          moment,
        });
      } else {
        res.send("data not found");
      }
    } catch (err) {
      console.log(err.stack);
    }
  });

  router.post("/edit/:id", async function (req, res, next) {
    console.log(`Masuk router.post /edit/:id di users.js`);
    try {
      const { email, password, fullname, roll } = req.body;
      // const { email, fullname, roll } = req.body;
      // const sql = "update users set email=$1, roll=$2 where id=$3";
      const sql =
        "update users set email=$1, password=$2, fullname=$3, roll=$4 where id=$5";
      bcrypt.hash(password, saltRounds, async function (err, hash) {
        const data = await db.query(sql, [
          email,
          hash,
          fullname,
          roll,
          req.params.id,
        ]);
        // const data = await db.query(sql, [email, fullname, roll, req.params.id]);
        // console.log(data);
        res.redirect("/users");
      });
    } catch (err) {
      console.log(err.stack);
    }
  });

  router.get("/delete/:id", async function (req, res, next) {
    console.log(`Masuk router.get /delete/:id di users.js`);
    try {
      const sql = "delete from users where id = $1";
      const data = await db.query(sql, [req.params.id]);
      // console.log(data);
      res.redirect("/users");
    } catch (err) {
      console.log(err.stack);
    }
  });

  return router;
};
