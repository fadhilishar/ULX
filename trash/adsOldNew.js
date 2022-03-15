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
    // console.log(req.query);
    console.log(`Masuk router.get / di ads.js`);
    // if(req.session.user.roll=="admin"){}
    try {
      // const field = [
      //   "title",
      //   "description",
      //   "price",
      //   "userid",
      //   "category",
      //   "publishdate",
      //   "pictures",
      // ];
      const field = [
        "title",
        "description",
        "price",
        "userid",
        "categoryid",
        "publishdate",
        "approved",
        "pictures",
      ];

      const sortBy = field.includes(req.query.sortBy) ? req.query.sortBy : "id";
      const sortMode = req.query.sortMode === "desc" ? "desc" : "asc";
      const url =
        req.url == "/"
          ? "/ads?page=1&sortBy=id&sortMode=asc"
          : `/ads${req.url}`;

      req.query.sortBy = sortBy;
      req.query.sortMode = sortMode;

      const {
        titlecheck,
        title,
        descriptioncheck,
        description,
        pricecheck,
        price,
        usercheck,
        user,
        categorycheck,
        category,
        publishdatecheck,
        startdate,
        enddate,
        approvedcheck,
        approved,
      } = req.query;

      let params = [];
      // let paramsCategories = [];
      // let paramsUsers = [];
      let values = [];
      // let valuesCategories = [];
      // let valuesUsers = [];
      let count = 1;

      if (titlecheck && title) {
        params.push(`title ilike '%' || $${count++} || '%'`);
        values.push(title);
      }
      if (descriptioncheck && description) {
        params.push(`description ilike '%' || $${count++} || '%'`);
        values.push(description);
      }
      if (pricecheck && price) {
        params.push(`price =$${count++} `);
        values.push(price);
      }
      if (usercheck && user) {
        const sqlUsers = `select * from users where fullname ilike '%' || $1 || '%'`;
        const dataUsers = await db.query(sqlUsers, [user]);
        console.log(`sqlUsers= ${sqlUsers}`);
        let userid = [];
        if (dataUsers.rows.length > 0) {
          let paramsTemp = "(";
          for (let index = 0; index < dataUsers.rows.length; index++) {
            userid.push(dataUsers.rows[index].id);
            values.push(userid[index]);
            if (index == dataUsers.rows.length - 1) {
              paramsTemp += `userid=$${count++}`;
            } else {
              paramsTemp += `userid=$${count++} or `;
            }
            console.log(`usersid[${index}]= ${userid[index]}`);
          }
          paramsTemp += `)`;
          params.push(paramsTemp);
          console.log(`params=${params}`);
          console.log(`userid= ${userid}`);
        }
      }
      if (categorycheck && category) {
        const sqlCategories = `select * from categories where name ilike '%' || $1 || '%'`;
        const dataCategories = await db.query(sqlCategories, [category]);
        console.log(`sqlCategories= ${sqlCategories}`);
        let categoryid = [];
        if (dataCategories.rows.length > 0) {
          let paramsTemp = "(";
          for (let index = 0; index < dataCategories.rows.length; index++) {
            categoryid.push(dataCategories.rows[index].id);
            values.push(categoryid[index]);
            if (index == dataCategories.rows.length - 1) {
              paramsTemp += `categoryid=$${count++}`;
            } else {
              paramsTemp += `categoryid=$${count++} or `;
            }
            console.log(`categoryid[${index}]= ${categoryid[index]}`);
          }
          paramsTemp += `)`;
          params.push(paramsTemp);
          console.log(`params=${params}`);
          console.log(`categoryid= ${categoryid}`);
        }
      }
      if (publishdatecheck && startdate && enddate) {
        console.log(`Masuk publishdate`);
        params.push(`publishdate between $${count++} and $${count++} `);
        values.push(startdate);
        values.push(enddate);
      } else if (publishdatecheck && startdate) {
        params.push(
          `publishdate between $${count++} and (select max(publishdate) from ads)`
        );
        values.push(startdate);
      } else if (publishdatecheck && enddate) {
        params.push(
          `publishdate between (select min(publishdate) from ads) and $${count++}`
        );
        values.push(`enddate`);
      }
      if (approvedcheck) {
        if (approved) {
          console.log(`Masuk approvedcheck`);
          console.log(`approved = ${approved}`);
          params.push(`approved = 'true'`);
          console.log(`params=${params}`);
        } else {
          params.push(`approved = 'false'`);
          console.log(`params=${params}`);
        }
      }

      const page = req.query.page || 1;
      const limit = 4;
      const offset = (page - 1) * limit;

      let sql = "select count(*) as total from ads";
      if (params.length > 0) {
        sql += ` where ${params.join(" and ")}`;
      }
      console.log(`sql itu =${sql}`);

      const totalResult = await db.query(sql, values);

      const pages = Math.ceil(totalResult.rows[0].total / limit);

      sql = `select ads.*, categories.name, users.fullname from ads,categories,users where ads.categoryid=categories.id and ads.userid=users.id`;
      // sql = `select ads.* from ads left join categories on ads.categoryid=categories.id left join users on ads.userid=users.id`;
      // let sqlCategories = `select categories.*,categoryid from categories,ads where categories.id=ads.categoryid`;
      // let sqlUsers = `select users.id, fullname, userid from users,ads where users.id=ads.userid`;
      console.log(`sql sini = ${sql}`);

      if (params.length > 0) {
        sql += ` and ${params.join(" and ")}`;
      }
      sql += ` order by ads.${sortBy} ${sortMode} limit ${limit} offset ${offset}`;

      // if (paramsCategories.length > 0) {
      //   sqlCategories += ` and ${paramsCategories}`;
      // }
      // sqlCategories += ` order by categories.${sortBy} ${sortMode} limit ${limit} offset ${offset}`;

      // if (paramsUsers.length > 0) {
      //   sqlUsers += ` and ${paramsUsers}`;
      // }
      // sqlUsers += ` order by users.${sortBy} ${sortMode} limit ${limit} offset ${offset}`;

      // sql = `select ads.*, categories.name, users.fullname from ads,categories,users where ads.categoryid=categories.id and ads.userid=users.id and (ads.userid=$1 or ads.userid=$2) order by ads.id asc limit 4 offset ${offset}`;

      console.log(`sql=${sql}`);
      // console.log(`sqlCategories=${sqlCategories}`);
      // console.log(`sqlUsers=${sqlUsers}`);

      console.log(`values=${values}`);
      // console.log(`valuesCategories=${valuesCategories}`);
      // console.log(`valuesUsers=${valuesUsers}`);

      console.log(`params=${params}`);
      // console.log(`paramsCategories=${paramsCategories}`);
      // console.log(`paramsUsers=${paramsUsers}`);

      const data = await db.query(sql, values);
      // const dataCategories = await db.query(sqlCategories, valuesCategories);
      // const dataUsers = await db.query(sqlUsers, valuesUsers);

      console.log(`data.rows =${JSON.stringify(data.rows)}`);
      console.log(`req.session.user=${req.session.user}`);
      // console.log(`dataCategories.rows=${JSON.stringify(dataCategories.rows)}`);
      // console.log(`dataUsers.rows=${JSON.stringify(dataUsers.rows)}`);
      console.log(`req.query=${JSON.stringify(req.query)}`);

      res.render("ads/list", {
        title: "Ads ULX",
        data: data.rows,
        // dataCategories: dataCategories.rows,
        // dataUsers: dataUsers.rows,
        moment,
        pagination: {
          page: Number(page),
          pages,
          url,
        },
        currencyFormat,
        currencyFormatter,
        user: req.session.user,
        query: req.query,
        successMessage: req.flash("successMessage"),
        errorMessage: req.flash("errorMessage"),
      });
    } catch (err) {
      req.flash("errorMessage", "Hanya admin yang boleh masuk domain ini");
      console.log(err.stack);
    }
  });

  router.get("/add", async function (req, res, next) {
    console.log(`Masuk router.get /add di ads.js`);
    try {
      const sql = `select ads.*, categories.name, users.fullname from ads,categories,users where ads.categoryid=categories.id and ads.userid=users.id`;
      const data = await db.query(sql, []);

      const sqlCategories = `select * from categories`;
      const dataCategories = await db.query(sqlCategories, []);

      const sqlUsers = `select id,fullname from users`;
      const dataUsers = await db.query(sqlUsers, []);

      console.log(`data.rows=${JSON.stringify(data.rows)}`);
      console.log(`dataCategories.rows=${JSON.stringify(dataCategories.rows)}`);
      console.log(`dataUsers.rows=${JSON.stringify(dataUsers.rows)}`);

      res.render("ads/form", {
        title: "Add Ads",
        data: data.rows,
        dataUsers: dataUsers.rows,
        dataCategories: dataCategories.rows,
        moment,
        currencyFormat,
        currencyFormatter,
        successMessage: req.flash("successMessage"),
        errorMessage: req.flash("errorMessage"),
      });
    } catch (error) {
      req.flash("errorMessage", "Hanya admin yang boleh masuk domain ini");
      console.log(`Masuk err router.get /add di ads.js`);
    }
  });

  router.post("/add", async function (req, res, next) {
    console.log(`Masuk router.post /add di ads.js`);
    try {
      const { title, description, price, userid, category, approved } =
        req.body;

      let params = [];
      let paramsValues = [];
      let values = [];
      let count = 1;

      if (title) {
        params.push(`title`);
        paramsValues.push(`$${count++}`);
        values.push(title);
      }
      if (description) {
        params.push(`description`);
        paramsValues.push(`$${count++}`);
        values.push(description);
      }
      if (price) {
        params.push(`price`);
        paramsValues.push(`$${count++}`);
        values.push(price);
      }
      if (userid) {
        params.push(`userid`);
        paramsValues.push(`$${count++}`);
        values.push(userid);
      }
      if (category) {
        params.push(`categoryid`);
        paramsValues.push(`$${count++}`);
        values.push(category);
      }
      if (approved) {
        params.push(`approved`);
        params.push(`publishdate`);
        paramsValues.push(`$${count++}`);
        paramsValues.push(`now()`);
        values.push(approved);
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
      }

      if (params.length > 0) {
        let sql = `insert into ads(${params.join(
          ", "
        )}) values(${paramsValues.join(",")})`;
        console.log(`sql= ${sql}`);
        const data = await db.query(sql, values);
        req.flash("successMessage", "Berhasil menambah iklan");
      } else if (params.length == 0) {
        req.flash("errorMessage", "Tidak ada iklan yang ditambahkan");
      }
      res.redirect("/ads");
    } catch (err) {
      console.log(err.stack);
    }
  });

  router.get("/edit/:id", async function (req, res, next) {
    console.log(`Masuk router.get /edit/:id di ads.js`);
    try {
      const sql = `select ads.*, categories.name, users.fullname from ads,categories,users where (ads.categoryid=categories.id) and (ads.userid=users.id) and (ads.id =$1)`;
      const data = await db.query(sql, [req.params.id]);
      console.log(`data.rows= ${JSON.stringify(data.rows)}`);

      const sqlCategories = `select name from categories`;
      const dataCategories = await db.query(sqlCategories, []);
      console.log(
        `dataCategories.rows= ${JSON.stringify(dataCategories.rows)}`
      );

      const sqlCategory = `select categories.* from categories,ads where (categories.id=ads.categoryid) and (ads.id=$1)`;
      const dataCategory = await db.query(sqlCategory, [req.params.id]);
      console.log(`dataCategory.rows= ${JSON.stringify(dataCategory.rows)}`);

      const sqlUsers = `select id,fullname from users`;
      const dataUsers = await db.query(sqlUsers, []);
      console.log(`dataUsers.rows= ${JSON.stringify(dataUsers.rows)}`);

      const sqlUser = `select users.* from users,ads where (users.id=ads.userid) and (ads.id=$1)`;
      const dataUser = await db.query(sqlUser, [req.params.id]);
      console.log(`dataUser.rows= ${JSON.stringify(dataUser.rows)}`);

      if (data.rows.length > 0) {
        res.render("ads/form", {
          title: "Edit Ads",
          data: data.rows[0],
          dataCategories: dataCategories.rows,
          dataCategory: dataCategory.rows[0],
          dataUsers: dataUsers.rows,
          dataUser: dataUser.rows[0],
          moment,
          currencyFormat,
          currencyFormatter,
          successMessage: req.flash("successMessage"),
          errorMessage: req.flash("errorMessage"),
        });
      } else {
        res.send("data not found");
      }
    } catch (err) {
      console.log(`Masuk err router.get /edit/:id di ads.js`);
      console.log(err.stack);
      req.flash("errorMessage", "Gagal masuk /get edit di ads.js");
    }
  });

  router.post("/edit/:id", async function (req, res, next) {
    console.log(`Masuk router.post /edit/:id di ads.js`);
    try {
      const { title, description, price, userid, categoryid, approved } =
        req.body;

      let params = [];
      let values = [];
      let count = 1;

      if (title) {
        params.push(`title=$${count++}`);
        values.push(title);
      }
      if (description) {
        params.push(`description=$${count++}`);
        values.push(description);
      }
      if (price) {
        params.push(`price=$${count++}`);
        values.push(price);
      }
      if (userid) {
        params.push(`userid=$${count++}`);
        values.push(userid);
      }
      if (categoryid) {
        params.push(`categoryid=$${count++}`);
        values.push(categoryid);
      }
      if (approved) {
        params.push(`approved=$${count++}`);
        params.push(`publishdate=now()`);
        values.push(approved);
      }
      if (!approved) {
        params.push(`approved='false'`);
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
      }

      if (params.length > 0) {
        values.push(req.params.id);
        // let sql = `insert into ads(${params.join(
        //   ", "
        // )}) values(${paramsValues.join(",")})`;
        let sql = `update ads set ${params.join(",")} where id=$${count++}`;
        console.log(`sql= ${sql}`);
        console.log(`values= ${values}`);
        console.log(`params= ${params}`);

        const data = await db.query(sql, values);
        req.flash("successMessage", "Berhasil mengedit iklan");
      } else if (params.length == 0) {
        req.flash("errorMessage", "Tidak ada iklan yang diedit");
      }
      res.redirect("/ads");
      // INI BAGIAN LAMA

      // const { title, description, price, user, category, publishdate } =
      //   req.body;
      // const sqlCategory = `select categories.id from categories where categories.name=$1`;
      // const dataCategory = await db.query(sqlCategory, [category]);
      // console.log(`dataCategory.rows=${JSON.stringify(dataCategory.rows)}`);
      // const categoryid = dataCategory.rows[0].id;

      // const sqlUser = `select users.id from users where users.fullname=$1`;
      // const dataUser = await db.query(sqlUser, [user]);
      // console.log(`dataUser.rows=${JSON.stringify(dataUser.rows)}`);
      // const userid = dataUser.rows[0].id;

      // if (req.files) {
      //   const file = req.files.pictures;
      //   // console.log(`file=${file}`);
      //   const pictures = `${Date.now()}-${file.name}`;
      //   let uploadPath = path.join(
      //     __dirname,
      //     "..",
      //     "public",
      //     "images",
      //     pictures
      //   );
      //   file.mv(uploadPath, function (err) {
      //     if (err) return res.status(500).send(err);
      //     // res.send("File uploaded!");
      //   });
      //   const sql =
      //     "update ads set title=$1 ,description=$2, price=$3, userid=$4, categoryid=$5, publishdate=$6, pictures=$7 where id=$8";
      //   // const dataCategories = await db.query(sqlCategories, [category]);
      //   // const categoryid = dataCategories.rows[0].categoryid;
      //   const data = await db.query(sql, [
      //     title,
      //     description,
      //     price,
      //     userid,
      //     categoryid,
      //     publishdate,
      //     [pictures],
      //     req.params.id,
      //   ]);
      //   // console.log(data);
      //   res.redirect("/ads");
      // }
      // // Use the mv() method to place the file somewhere on your server

      // if (!req.files || Object.keys(req.files).length === 0) {
      //   const sql =
      //     "update ads set title=$1 ,description=$2, price=$3, userid=$4, categoryid=$5, publishdate=$6 where id=$7";
      //   // const dataCategories = await db.query(sqlCategories, []);
      //   // const categoryid = dataCategories.rows[0].categoryid;
      //   console.log(`categoryid =${categoryid}`);
      //   const data = await db.query(sql, [
      //     title,
      //     description,
      //     price,
      //     userid,
      //     categoryid,
      //     publishdate,
      //     req.params.id,
      //   ]);
      //   return res.redirect("/ads");
      // }
    } catch (err) {
      console.log(err.stack);
    }
  });

  router.get("/delete/:id", async function (req, res, next) {
    console.log(`Masuk router.get /delete/:id di ads.js`);
    try {
      const sql = "delete from ads where id = $1";
      const data = await db.query(sql, [req.params.id]);
      // console.log(data);
      req.flash("successMessage", "Berhasil menghapus iklan");
      req.flash("errorMessage", "Tidak ada iklan yang dihapus");
      res.redirect("/ads");
    } catch (err) {
      console.log(err.stack);
    }
  });

  return router;
};
