var express = require("express");
var router = express.Router();
var moment = require("moment");

/* GET home page. */
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

module.exports = function (db) {
  router.get("/", isAdmin, async function (req, res, next) {
    console.log(`Masuk router.get / di categories.js`);
    try {
      const field = ["name"];
      // console.log("field = " + field);
      const sortBy = field.includes(req.query.sortBy) ? req.query.sortBy : "id";
      const sortMode = req.query.sortMode === "desc" ? "desc" : "asc";
      const url =
        req.url == "/"
          ? "/categories?page=1&sortBy=id&sortMode=asc"
          : `/categories${req.url}`;

      req.query.sortBy = sortBy;
      req.query.sortMode = sortMode;

      const name = req.query.name;

      let params = [];
      let values = [];
      let count = 1;

      if (name) {
        params.push(`name ilike '%' || $${count++} || '%'`);
        values.push(name);
      }

      const page = req.query.page || 1;
      const row = 3;
      const offset = (page - 1) * row;

      let sql = "select count(*) as total from categories";
      if (params.length > 0) {
        sql += ` where ${params.join(" and")}`;
      }

      const totalResult = await db.query(sql, values);
      const pages = Math.ceil(totalResult.rows[0].total / row);

      sql = `select * from categories`;
      if (params.length > 0) {
        sql += ` where ${params.join(" and ")}`;
      }

      sql += ` order by ${sortBy} ${sortMode} limit ${row} offset ${offset}`;

      const data = await db.query(sql, values);
      // console.log(`data`);
      // console.log(data);
      res.render("categories/list", {
        title: "Categories ULX",
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

  router.get("/add", isAdmin, async function (req, res, next) {
    console.log(`Masuk router.get /add di categories.js`);
    res.render("categories/form", {
      title: "add",
      data: {},
      moment,
      successMessage: req.flash("successMessage"),
      errorMessage: req.flash("errorMessage"),
      user: req.session.user,
      query: req.query,
    });
  });

  router.post("/add", isAdmin, async function (req, res, next) {
    console.log(`Masuk router.post /add di categories.js`);
    try {
      const name = req.body.name;
      const sql = "insert into categories(name) values ($1)";
      const data = await db.query(sql, [name]);

      res.redirect("/categories");
    } catch (err) {
      console.log(err.stack);
    }
  });

  router.get("/edit/:id", isAdmin, async function (req, res, next) {
    console.log(`Masuk router.get /edit/:id di categories.js`);
    try {
      const sql = "select * from categories where id=$1";
      const data = await db.query(sql, [req.params.id]);
      if (data.rows.length > 0) {
        res.render("categories/form", {
          title: "edit",
          data: data.rows[0],
          moment,
          successMessage: req.flash("successMessage"),
          errorMessage: req.flash("errorMessage"),
        });
      } else {
        res.send("data not found");
      }
    } catch (err) {
      console.log(err.stack);
    }
  });

  router.post("/edit/:id", async function (req, res, next) {
    console.log(`Masuk router.post /edit/:id di categories.js`);
    try {
      const name = req.body.name;
      const sql = "update categories set name=$1 where id=$2";
      const data = await db.query(sql, [name, req.params.id]);
      // console.log(data);
      res.redirect("/categories");
    } catch (err) {
      console.log(err.stack);
    }
  });

  router.get("/delete/:id", isAdmin, async function (req, res, next) {
    console.log(`Masuk router.get /delete/:id di categories.js`);
    try {
      const sql = "delete from categories where id = $1";
      const data = await db.query(sql, [req.params.id]);
      // console.log(data);
      res.redirect("/categories");
    } catch (err) {
      console.log(err.stack);
    }
  });

  return router;
};
