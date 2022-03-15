var express = require("express");
var router = express.Router();
var moment = require("moment");
var path = require("path");
var currencyFormatter = require("currency-formatter");
var currencyFormat = {
  symbol: "Rp",
  decimal: ",",
  thousand: ".",
  precision: 2,
  format: "%s %v", // %s is the symbol and %v is the value
};

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
    res.redirect("/login");
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
  router.get("/", async function (req, res, next) {
    console.log(`Masuk router.get / di index.js`);
    try {
      // let uang = currencyFormatter.format(1000000, {
      //   symbol: "Rp",
      //   decimal: ",",
      //   thousand: ".",
      //   precision: 2,
      //   format: "%s %v", // %s is the symbol and %v is the value
      // });
      // console.log(`uang=${uang}`);

      // console.log(`currencies=${JSON.stringify(currencies)}`);
      const field = ["name"];

      const sortBy = field.includes(req.query.sortBy) ? req.query.sortBy : "id";
      const sortMode = req.query.sortMode === "desc" ? "desc" : "asc";
      const url = req.url == "/" ? "/?page=1&sortBy=id&sortMode=asc" : req.url;

      req.query.sortBy = sortBy;
      req.query.sortMode = sortMode;

      const { search } = req.query;

      console.log(`search = ${search}`);

      let params = [];
      let values = [];
      let count = 1;

      const page = req.query.page || 1;
      const limit = 20;
      const offset = (page - 1) * limit;

      let sql = "select count(*) as total from ads";
      if (params.length > 0) {
        sql += ` where ${params.join(" and")}`;
      }

      const totalResult = await db.query(sql, values);
      const pages = Math.ceil(totalResult.rows[0].total / limit);

      sql = `select * from ads where ads.approved='true'`;
      if (params.length > 0) {
        sql += ` where ${params.join(" and ")}`;
      }

      if (search) {
        sql = `select ads.*,categories.* from ads,categories where ads.categoryid=categories.id and ads.title ilike '%' || $1 || '%'`;
        values.push(search);
        console.log(`sql,values = ${sql}, ${values}`);
      }

      // sql += ` order by ads.${sortBy} ${sortMode} limit ${limit} offset ${offset}`;

      sql += ` limit ${limit} offset ${offset}`;

      const data = await db.query(sql, values);
      console.log(`data= ${JSON.stringify(data.rows)}`);

      const sqlCategories = `select * from categories`;
      const dataCategories = await db.query(sqlCategories, []);
      console.log(`dataCategories= ${JSON.stringify(dataCategories.rows)}`);

      console.log(`req.query= ${JSON.stringify(req.query)}`);

      if (req.session.user) {
        console.log(`req.session.user =${JSON.stringify(req.session.user)}`);
        userIn = true;
        const user = req.session.user.id;
        const sqlUser = `select * from users where id=$1`;
        const dataUser = await db.query(sqlUser, [user]);
        if (req.session.user.roll == "admin") {
          userRoll = "admin";
        } else {
          userRoll = "postgres";
        }

        // console.log(`data.rows[0].pictures =${data.rows[0].pictures}`);
        // console.log(`data.rows =${JSON.stringify(data.rows)}`);
        res.render("index", {
          title: "Index ULX",
          data: data.rows,
          dataCategories: dataCategories.rows,
          moment,
          pagination: {
            page: Number(page),
            pages,
            url,
          },
          currencyFormatter,
          currencyFormat,
          userIn,
          dataUser: dataUser.rows[0],
          user: req.session.user,
          query: req.query,
        });
      } else {
        res.render("index", {
          title: "Index ULX",
          data: data.rows,
          dataCategories: dataCategories.rows,
          moment,
          pagination: {
            page: Number(page),
            pages,
            url,
          },
          currencyFormatter,
          currencyFormat,
          userIn,
          user: req.session.user,
          query: req.query,
        });
      }
    } catch (err) {
      req.flash("errorMessage", "Hanya admin yang boleh masuk domain itu");
      console.log(err.stack);
    }
  });

  router.get("/register", async function (req, res, next) {
    console.log(`Masuk router.get /register di index.js`);
    try {
      const sql = `select email from users`;
      const data = await db.query(sql, []);
      res.render("register", {
        title: "Register",
        data: data.rows,
        moment,
        successMessage: req.flash("successMessage"),
        errorMessage: req.flash("errorMessage"),
      });
    } catch (error) {
      console.log(err.stack);
    }
  });

  router.post("/register", async function (req, res, next) {
    console.log(`Masuk router.post /register di index.js`);
    try {
      const fullname = req.body.inputname;
      const email = req.body.inputemail;
      const password = req.body.inputpassword;
      // console.log(`fullname=${fullname}`);
      // console.log(`email=${email}`);
      // console.log(`password=${password}`);
      const sqlUser = `select email from users where email=$1`;
      const dataUser = await db.query(sqlUser, [email]);
      console.log(`dataUser= ${JSON.stringify(dataUser.rows)}`);

      if (dataUser.rows.length > 0) {
        // console.log(`user not found`);
        req.flash("registerMessage", "Email address had been registered");
        res.redirect("/register");
      } else {
        bcrypt.hash(password, saltRounds, async function (err, hash) {
          console.log(`hash= ${hash} selesai hash`);
          const sql =
            "insert into users(fullname, email, password) values ($1,$2,$3)";
          const data = await db.query(sql, [fullname, email, hash]);
          req.flash("message", "Register Success");
          res.redirect("/login");
          // Store hash in your password DB.
        });
      }
    } catch (err) {
      console.log(err.stack);
    }
  });

  router.get("/login", async function (req, res, next) {
    console.log(`Masuk router.get /login di index.js`);
    try {
      // const sql = `select name,id from users`;
      // const dataUsers = await db.query(sql, []);
      // console.log(`dataUsers.rows= ${JSON.stringify(dataUsers.rows)}`);
      res.render("login", {
        title: "Login",
        data: {},
        moment,
        successMessage: req.flash("successMessage"),
        errorMessage: req.flash("errorMessage"),
      });
    } catch (error) {
      console.log(err.stack);
    }
  });

  router.post("/login", async function (req, res, next) {
    console.log(`Masuk router.post /login di index.js`);
    try {
      const user = req.body.email;
      // console.log(`email=${email}`);
      console.log(`user=${user}`);
      const password = req.body.password;
      // console.log(`password=${password}`);

      const sqlPassword = "select password from users where email=$1";
      const dataPassword = await db.query(sqlPassword, [user]);
      // console.log(
      //   `dataPassword.rows[0].password= ${JSON.stringify(
      //     dataPassword.rows[0].password
      //   )}`
      // );

      const sql =
        "select id, email, fullname, roll, avatar from users where email=$1";
      const data = await db.query(sql, [user]);
      // console.log(`data=${JSON.stringify(data)}`);
      if (data.rows.length == 0) {
        // console.log(`user not found`);
        req.flash("errorMessage", "User not Found");
        return res.redirect("/login");
      }
      // console.log(`password di db =${data.rows[0].password}`);

      bcrypt.compare(
        password,
        dataPassword.rows[0].password,
        async function (err, result) {
          // result == true
          console.log(`result= ${result}`);
          if (!result) {
            req.flash("errorMessage", "Password is wrong");
            return res.redirect("/login");
          }
          req.session.user = data.rows[0];
          console.log(`req.session.user =${JSON.stringify(req.session.user)}`);
          if (req.session.user.roll == "admin") res.redirect("/ads");
          else res.redirect("/");
        }
      );
    } catch (err) {
      req.flash("errorMessage", "Gagal Login");
      return res.redirect("/login");
    }
  });

  router.get("/logout", async function (req, res, next) {
    console.log(`Masuk router.get /logout di index.js`);
    try {
      req.session.destroy(function (err) {
        userIn = false;
        res.redirect("/");
      });
    } catch (err) {
      req.flash("errorMessage", "Gagal Login");
      return res.redirect("/login");
    }
  });

  router.get("/profile", isLoggedIn, async function (req, res, next) {
    console.log(`Masuk router.get /profile di index.js`);
    try {
      const userid = req.session.user.id;
      // console.log(`user = ${user}`);

      // MANTAP SALAH LINE console.log DOANG GA BISA MASUK KE /profile DAN GA ADA PESAN ERROR
      // JADI CONSOLE LOG YG PAKE DATA ITU SUPER BAHAYA

      const sqlUser = `select * from users where id=$1`;
      const dataUser = await db.query(sqlUser, [userid]);
      // console.log(`dataUser.rows =${JSON.stringify(dataUser.rows)}`);

      // const dataPassword = dataUser.rows[0].password;

      const sqlAds = `select * from ads where userid=$1`;
      const dataAds = await db.query(sqlAds, [userid]);
      // console.log(`dataAds.rows =${JSON.stringify(dataAds.rows)}`);

      const sqlAdsApproved = `select * from ads where userid=$1 and ads.approved='true'`;
      const dataAdsApproved = await db.query(sqlAdsApproved, [userid]);
      // console.log(`dataAdsApproved.rows =${JSON.stringify(dataAdsApproved.rows)}`);
      const sqlAdsNotApproved = `select * from ads where userid=$1 and ads.approved='false'`;
      const dataAdsNotApproved = await db.query(sqlAdsNotApproved, [userid]);

      res.render("profile", {
        title: "Profile",
        dataUser: dataUser.rows[0],
        dataAds: dataAds.rows,
        dataAdsApproved: dataAdsApproved.rows,
        dataAdsNotApproved: dataAdsNotApproved.rows,
        moment,
        currencyFormatter,
        currencyFormat,
        successMessage: req.flash("successMessage"),
        errorMessage: req.flash("errorMessage"),
      });
    } catch (err) {
      req.flash("errorMessage", "Gagal Masuk /Profile");
      return res.redirect("/");
    }
  });

  router.post("/profile", async function (req, res, next) {
    console.log(`Masuk router.post /profile di index.js`);
    try {
      // SALAH GARA GARA PAKE EKSTENSI GOOGLE YG AUTO KASIH PASSWORD KITA
      // BUKAN, GARA GARA RES.REDIRECT JADI GAGAL, MUNCUL TULISAN MERAH DI BAGIAN BAWAH

      // if (!req.files || Object.keys(req.files).length === 0) {
      //   return res.status(400).send("No files were uploaded.");
      // }
      const userid = req.session.user.id;
      // console.log(`user= ${JSON.stringify(user)}`);

      const { fullname, email, password, phone } = req.body;
      // console.log(`req.body= ${JSON.stringify(req.body)}`);

      let params = [];
      let values = [userid];
      let count = 2;
      if (fullname) {
        params.push(`fullname=$${count++}`);
        values.push(fullname);
        console.log(`Selesai pengisian nama`);
        console.log(`values= ${values}`);
      }

      // console.log(`fullname= ${fullname}`);

      if (email) {
        params.push(`email=$${count++}`);
        values.push(email);
        console.log(`Selesai pengisian email`);
        console.log(`values= ${values}`);
      }

      // console.log(`email= ${email}`);

      if (phone) {
        params.push(`phone=$${count++}`);
        values.push(phone);
        console.log(`Selesai pengisian phone`);
        console.log(`values= ${values}`);
      }

      if (req.files) {
        console.log(`Masuk req.files di router.post /profile`);

        const fileAvatar = req.files.fileAvatar;
        console.log(`fileAvatar.name=${JSON.stringify(fileAvatar.name)}`);

        const avatar = `${Date.now()}-${fileAvatar.name}`;
        params.push(`avatar=$${count++}`);
        values.push(avatar);

        console.log(`values= ${values}`);

        let uploadPath = path.join(__dirname, "..", "public", "images", avatar);
        console.log(`uploadPath = ${uploadPath}`);

        fileAvatar.mv(uploadPath, function (err) {
          if (err) return res.status(500).send(err);
          // res.send("File uploaded!");
        });
      }

      let sql = ``;

      if (password) {
        params.push(`password=$${count++}`);
        bcrypt.hash(password, saltRounds, async function (err, hasil) {
          console.log(`hasil= ${hasil} selesai hash`);
          values.push(hasil);
          console.log(`Selesai pengisian password`);
          console.log(`values =${values}`);

          sql = `update users set ${params.join(", ")} where id=$1`;
          console.log(`sql= ${sql}`);

          let data = await db.query(sql, values);
          req.flash("successMessage", "Update Data Berhasil");
        });
      }

      if (params.length > 0 && !password) {
        // values.push(userid);
        sql = `update users set ${params.join(", ")} where id=$1`;
        console.log(`sql= ${sql}`);
        let data = await db.query(sql, values);
        req.flash("successMessage", "Update Data Berhasil");
      } else if (params.length == 0) req.flash("errorMessage", "Data Tidak Diupdate");
      // sql = `select id, fullname, email, roll from users where id=$1`;
      // data = await db.query(sql, [user]);

      // req.session.user = data.rows[0];
      // console.log(`req.session.user = ${JSON.stringify(req.session.user)}`);

      return res.redirect("/profile");

      // else if (!password) {
      //   console.log(`Lewat if password di router.post /profile`);
      //   sql = `update users set`;
      //   if (params.length > 0) {
      //     sql += ` ${params.join(", ")}`;
      //   }
      //   sql += ` where id=$1`;

      //   console.log(`sql= ${sql}`);
      //   let data = await db.query(sql, values);
      //   console.log(`data.rows= ${JSON.stringify(data.rows)}`);

      //   sql = `select id, fullname, email, roll from users where id=$1`;
      //   data = await db.query(sql, [user]);
      //   console.log(`data.rows= ${JSON.stringify(data.rows)}`);

      //   req.session.user = data.rows[0];
      //   console.log(`req.session= ${JSON.stringify(req.session.user)}`);

      //   req.flash("updateMessage", "Update Data Berhasil");
      //   res.redirect("/profile");
      // }
    } catch (err) {
      console.log(`Masuk error di router.post /profile di index.js`);
      req.flash("errorMessage", "Gagal Edit /Profile");
      return res.redirect("/");
    }
  });

  router.get("/sell", isLoggedIn, async function (req, res, next) {
    console.log(`Masuk router.get /sell di index.js`);
    try {
      const userid = req.session.user.id;
      console.log(`user = ${userid}`);

      // const sqlAds = `select * from ads where userid=$1`;
      // const dataAds = await db.query(sqlAds, [userid]);
      // console.log(`dataAds.rows =${JSON.stringify(dataAds.rows)}`);
      // ADA APA DENGAN KODE INI?? KOK JADI ERROR KALAU DINYALAIN

      const sqlCategories = `select * from categories`;
      const dataCategories = await db.query(sqlCategories, []);
      console.log(
        `dataCategories.rows =${JSON.stringify(dataCategories.rows)}`
      );

      res.render("sell", {
        title: "Sell",
        dataAds: {},
        // dataAds: dataAds.rows,
        dataCategories: dataCategories.rows,
        moment,
        currencyFormatter,
        currencyFormat,
        successMessage: req.flash("successMessage"),
        errorMessage: req.flash("errorMessage"),
      });
    } catch (err) {
      req.flash("errorMessage", "Gagal Masuk /sell");
      return res.redirect("/");
    }
  });

  router.post("/sell", async function (req, res, next) {
    console.log(`Masuk router.post /sell di index.js`);
    try {
      console.log(`Masuk sini`);
      const { title, description, price, categoryid } = req.body;

      console.log(`title= ${title}`);
      console.log(`description= ${description}`);
      console.log(`price= ${price}`);
      console.log(`categoryid= ${categoryid}`);

      const userid = req.session.user.id;

      let params = [`userid`];
      let paramsValues = [`$1`];
      let values = [userid];
      let count = 2;

      if (title) {
        params.push(`title`);
        paramsValues.push(`$${count++}`);
        values.push(title);
        console.log(`Selesai pengisian title`);
        console.log(`values= ${values}`);
      }
      if (description) {
        params.push(`description`);
        paramsValues.push(`$${count++}`);
        values.push(description);
        console.log(`Selesai pengisian description`);
        console.log(`values= ${values}`);
      }
      if (price) {
        params.push(`price`);
        paramsValues.push(`$${count++}`);
        values.push(price);
        console.log(`Selesai pengisian price`);
        console.log(`values= ${values}`);
      }
      if (categoryid) {
        params.push(`categoryid`);
        paramsValues.push(`$${count++}`);
        values.push(categoryid);
        console.log(`Selesai pengisian categoryid`);
        console.log(`values= ${values}`);
      }
      if (req.files) {
        const file = req.files.pictures;
        const pictures = `${Date.now()}-${file.name}`;
        let uploadPath = path.join(
          __dirname,
          "..",
          "public",
          "images",
          pictures
        );
        file.mv(uploadPath, function (err) {
          if (err) return res.status(500).send(err);
          // res.send("File uploaded!");
        });
        params.push(`pictures`);
        paramsValues.push(`$${count++}`);
        values.push([pictures]);
        console.log(`Selesai pengisian pictures`);
        console.log(`values= ${values}`);
      }

      if (params.length > 0) {
        let sql = `insert into ads(${params.join(
          ", "
        )}) values(${paramsValues.join(",")})`;
        console.log(`sql= ${sql}`);
        const data = await db.query(sql, values);
        req.flash("successMessage", "Iklan berhasil ditambahkan");
      } else if (params.length == 0) {
        req.flash("errorMessage", "Tidak ada iklan yang ditambahkan");
      }
      return res.redirect("/profile");
    } catch (err) {
      console.log(`Masuk error di router.post /sell di index.js`);
      req.flash("errorMessage", "Gagal Edit /sell");
      return res.redirect("/sell");
    }
  });

  router.get("/sell/:id", isLoggedIn, async function (req, res, next) {
    console.log(`Masuk router.get /sell di index.js`);
    try {
      const user = req.session.user;
      // console.log(`user = ${user}`);

      // const sqlAds = `select * from ads where userid=$1`;
      // const dataAds = await db.query(sqlAds, [userid]);
      // console.log(`dataAds.rows =${JSON.stringify(dataAds.rows)}`);
      // ADA APA DENGAN KODE INI?? KOK JADI ERROR KALAU DINYALAIN

      const adsid = req.params.id;
      console.log(`adsid =`);
      console.log(`${adsid}`);
      const sqlAds = `select * from ads where id=$1`;
      const dataAds = await db.query(sqlAds, [adsid]);
      console.log(`123`);

      const sqlCategories = `select * from categories`;
      const dataCategories = await db.query(sqlCategories, []);
      console.log(
        `dataCategories.rows =${JSON.stringify(dataCategories.rows)}`
      );
      console.log(`1234`);

      const categoryid = dataAds.rows[0].categoryid;
      const sqlCategory = `select * from categories where id=$1`;
      const dataCategory = await db.query(sqlCategory, [categoryid]);
      console.log(
        `dataCategories.rows =${JSON.stringify(dataCategories.rows)}`
      );
      console.log(`12345`);

      res.render("sell", {
        title: "Sell Edit",
        // data: {},
        dataAds: dataAds.rows[0],
        dataCategories: dataCategories.rows,
        dataCategory: dataCategory.rows[0],
        moment,
        user,
        currencyFormatter,
        currencyFormat,
        successMessage: req.flash("successMessage"),
        errorMessage: req.flash("errorMessage"),
      });
    } catch (err) {
      req.flash("errorMessage", "Gagal Masuk /sell");
      return res.redirect("/");
    }
  });

  router.post("/sell/:id", async function (req, res, next) {
    console.log(`Masuk router.post /sell di index.js`);
    try {
      console.log(`Masuk sini`);
      const { title, description, price, categoryid } = req.body;

      console.log(`title= ${title}`);
      console.log(`description= ${description}`);
      console.log(`price= ${price}`);
      console.log(`categoryid= ${categoryid}`);

      const userid = req.session.user.id;

      let params = [`userid=$1`];
      let paramsValues = [`$1`];
      let values = [userid];
      let count = 2;

      if (title) {
        params.push(`title=$${count++}`);
        // paramsValues.push(`$${count++}`);
        values.push(title);
        console.log(`Selesai pengisian title`);
        console.log(`values= ${values}`);
      }
      if (description) {
        params.push(`description=$${count++}`);
        // paramsValues.push(`$${count++}`);
        values.push(description);
        console.log(`Selesai pengisian description`);
        console.log(`values= ${values}`);
      }
      if (price) {
        params.push(`price=$${count++}`);
        // paramsValues.push(`$${count++}`);
        values.push(price);
        console.log(`Selesai pengisian price`);
        console.log(`values= ${values}`);
      }
      if (categoryid) {
        params.push(`categoryid=$${count++}`);
        // paramsValues.push(`$${count++}`);
        values.push(categoryid);
        console.log(`Selesai pengisian categoryid`);
        console.log(`values= ${values}`);
      }
      if (req.files) {
        const file = req.files.pictures;
        const pictures = `${Date.now()}-${file.name}`;
        let uploadPath = path.join(
          __dirname,
          "..",
          "public",
          "images",
          pictures
        );
        file.mv(uploadPath, function (err) {
          if (err) return res.status(500).send(err);
          // res.send("File uploaded!");
        });
        params.push(`pictures=$${count++}`);
        // paramsValues.push(`$${count++}`);
        values.push([pictures]);
        console.log(`Selesai pengisian pictures`);
        console.log(`values= ${values}`);
      }

      if (params.length > 0) {
        params.push(`approved='false'`);
        values.push(req.params.id);
        let sql = `update ads set ${params.join(
          ", "
        )} where ads.id=$${count++}`;
        console.log(`sql= ${sql}`);
        const data = await db.query(sql, values);
        req.flash("successMessage", "Iklan berhasil ditambahkan");
      } else if (params.length == 0) {
        req.flash("errorMessage", "Tidak ada iklan yang ditambahkan");
      }
      return res.redirect("/profile");
    } catch (err) {
      console.log(`Masuk error di router.post /sell di index.js`);
      req.flash("errorMessage", "Gagal Edit /sell");
      return res.redirect("/sell");
    }
  });

  router.get("/goods/:id", async function (req, res, next) {
    console.log(`Masuk router.get /barang/:id di index.js`);
    try {
      const sqlAd = `select * from ads where id=$1`;
      const dataAd = await db.query(sqlAd, [req.params.id]);
      console.log(`dataAd= ${JSON.stringify(dataAd.rows[0].pictures[0])}`);

      const sellerid = dataAd.rows[0].userid;
      const sqlSeller = `select id,fullname,phone,avatar from users where users.id=$1`;
      const dataSeller = await db.query(sqlSeller, [sellerid]);
      console.log(`dataSeller= ${JSON.stringify(dataSeller.rows)}`);

      const dataUser = req.session.user;
      console.log(`dataUser= ${JSON.stringify(dataUser)}`);

      if (req.session.user == true) userIn = true;

      res.render("goods", {
        title: "Goods",
        dataAd: dataAd.rows[0],
        dataSeller: dataSeller.rows[0],
        dataUser,
        userIn,
        currencyFormat,
        currencyFormatter,
        moment,
        successMessage: req.flash("successMessage"),
        errorMessage: req.flash("errorMessage"),
      });
    } catch (error) {}
  });
  return router;
};
