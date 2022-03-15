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

/* GET home page. */
module.exports = function (db) {
  router.get("/", async function (req, res, next) {
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
      } = req.query;

      let params = [];
      let paramsCategories = [];
      let paramsUsers = [];
      let values = [];
      let valuesCategories = [];
      let valuesUsers = [];
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
        params.push(`price =$${count++}`);
        values.push(price);
      }
      if (usercheck && user) {
        paramsUsers.push(`fullname ilike '%' || $${count++} || '%'`);
        valuesUsers.push(user);
      }
      if (categorycheck && category) {
        paramsCategories.push(`category =$${count++}`);
        valuesCategories.push(category);
      }
      if (publishdatecheck && startdate && enddate) {
        params.push(`date between $${count++} and $${count++} `);
        values.push(startdate);
        values.push(enddate);
      } else if (publishdatecheck && startdate) {
        params.push(`date between $${count++} and (select max(date) from ads)`);
        values.push(startdate);
      } else if (publishdatecheck && enddate) {
        params.push(`date between (select min(date) from ads) and $${count++}`);
        values.push(`enddate`);
      }

      const page = req.query.page || 1;
      const limit = 3;
      const offset = (page - 1) * limit;

      let sql = "select count(*) as total from ads";
      if (params.length > 0) {
        sql += ` where ${params.join(" and")}`;
      }

      const totalResult = await db.query(sql, values);
      const pages = Math.ceil(totalResult.rows[0].total / limit);

      sql = `select * from ads`;
      let sqlCategories = `select categories.*,categoryid from categories,ads where categories.id=ads.categoryid`;
      let sqlUsers = `select users.id, fullname, userid from users,ads where users.id=ads.userid`;

      if (params.length > 0) {
        sql += ` where ${params.join(" and ")}`;
      }
      sql += ` order by ${sortBy} ${sortMode} limit ${limit} offset ${offset}`;

      if (paramsCategories.length > 0) {
        sqlCategories += ` and ${paramsCategories}`;
      }
      // sqlCategories += ` order by categories.${sortBy} ${sortMode} limit ${limit} offset ${offset}`;

      if (paramsUsers.length > 0) {
        sqlUsers += ` and ${paramsUsers}`;
      }
      // sqlUsers += ` order by users.${sortBy} ${sortMode} limit ${limit} offset ${offset}`;

      console.log(`sql=${sql}`);
      console.log(`sqlCategories=${sqlCategories}`);
      console.log(`sqlUsers=${sqlUsers}`);

      console.log(`values=${values}`);
      console.log(`valuesCategories=${valuesCategories}`);
      console.log(`valuesUsers=${valuesUsers}`);

      console.log(`params=${params}`);
      console.log(`paramsCategories=${paramsCategories}`);
      console.log(`paramsUsers=${paramsUsers}`);

      const data = await db.query(sql, values);
      const dataCategories = await db.query(sqlCategories, valuesCategories);
      const dataUsers = await db.query(sqlUsers, valuesUsers);

      console.log(`data.rows =${JSON.stringify(data.rows)}`);
      console.log(`req.session.user=${req.session.user}`);
      console.log(`dataCategories.rows=${JSON.stringify(dataCategories.rows)}`);
      console.log(`dataUsers.rows=${JSON.stringify(dataUsers.rows)}`);

      res.render("ads/list", {
        title: "Ads ULX",
        data: data.rows,
        dataCategories: dataCategories.rows,
        dataUsers: dataUsers.rows,
        moment,
        pagination: {
          page: Number(page),
          pages,
          url,
        },
        currencyFormat,
        currencyFormatter,
        // user: req.session.user.email,
        query: req.query,
      });
    } catch (err) {
      console.log(err.stack);
    }
  });

  router.get("/add", async function (req, res, next) {
    console.log(`Masuk router.get /add di ads.js`);
    const sqlCategories = `select * from categories`;
    const dataCategories = await db.query(sqlCategories, []);
    console.log(`dataCategories.rows=${JSON.stringify(dataCategories.rows)}`);
    res.render("ads/form", {
      title: "Add Ads",
      data: {},
      dataCategories: dataCategories.rows[0],
      moment,
      currencyFormat,
      currencyFormatter,
    });
  });

  router.post("/add", async function (req, res, next) {
    console.log(`Masuk router.post /add di ads.js`);
    try {
      if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send("No files were uploaded.");
      }
      // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
      const file = req.files.pictures;
      // console.log(`file=${file}`);
      const pictures = `${Date.now()}-${file.name}`;
      let uploadPath = path.join(__dirname, "..", "public", "images", pictures);

      // Use the mv() method to place the file somewhere on your server
      file.mv(uploadPath, function (err) {
        if (err) return res.status(500).send(err);
        // res.send("File uploaded!");
      });
      const { title, description, price, user, category, publishdate } =
        req.body;
      const sql =
        "insert into ads(title, description, price, userid, categoryid, publishdate, pictures) values ($1, $2, $3, $4, $5, $6, $7)";

      const sqlCategories = `select name from categories`;
      const dataCategories = await db.query(sqlCategories, []);

      const categoryid = dataCategories.rows[0].categoryid;

      console.log(`categoryid =${categoryid}`);
      const data = await db.query(sql, [
        title,
        description,
        price,
        user,
        categoryid,
        publishdate,
        [pictures],
      ]);

      // if (admin) res.redirect("/ads");
      res.redirect("/ads");
    } catch (err) {
      console.log(err.stack);
    }
  });

  router.get("/edit/:id", async function (req, res, next) {
    console.log(`Masuk router.get /edit/:id di ads.js`);
    try {
      const sql = "select * from ads where ads.id=$1";
      let sqlCategories = `select name from categories`;
      const data = await db.query(sql, [req.params.id]);
      const dataCategories = await db.query(sqlCategories, []);
      console.log(`dataCategories.rows=${JSON.stringify(dataCategories.rows)}`);

      const sqlCategory = `select categories.*,ads.id from categories,ads where categories.id=ads.categoryid and ads.id=$1`;
      const dataCategory = await db.query(sqlCategory, [req.params.id]);
      console.log(`dataCategory.rows=${JSON.stringify(dataCategory.rows)}`);

      if (data.rows.length > 0) {
        res.render("ads/form", {
          title: "Edit Ads",
          data: data.rows[0],
          dataCategories: dataCategories.rows,
          dataCategory: dataCategory.rows,
          moment,
          currencyFormat,
          currencyFormatter,
        });
      } else {
        res.send("data not found");
      }
    } catch (err) {
      console.log(err.stack);
    }
  });

  router.post("/edit/:id", async function (req, res, next) {
    console.log(`Masuk router.post /edit/:id di ads.js`);
    try {
      // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
      const { title, description, price, userid, category, publishdate } =
        req.body;
      const sqlCategory = `select categories.id from categories where categories.name=$1`;
      const dataCategory = await db.query(sqlCategory, [category]);
      console.log(`dataCategory.rows=${JSON.stringify(dataCategory.rows)}`);
      const categoryid = dataCategory.rows[0].id;

      if (req.files) {
        const file = req.files.pictures;
        // console.log(`file=${file}`);
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
        const sql =
          "update ads set title=$1 ,description=$2, price=$3, userid=$4, categoryid=$5, publishdate=$6, pictures=$7 where id=$8";
        // const dataCategories = await db.query(sqlCategories, [category]);
        // const categoryid = dataCategories.rows[0].categoryid;
        const data = await db.query(sql, [
          title,
          description,
          price,
          userid,
          categoryid,
          publishdate,
          [pictures],
          req.params.id,
        ]);
        // console.log(data);
        res.redirect("/ads");
      }
      // Use the mv() method to place the file somewhere on your server

      if (!req.files || Object.keys(req.files).length === 0) {
        const sql =
          "update ads set title=$1 ,description=$2, price=$3, userid=$4, categoryid=$5, publishdate=$6 where id=$7";
        const sqlCategories = `select name from categories`;
        // const dataCategories = await db.query(sqlCategories, []);
        // const categoryid = dataCategories.rows[0].categoryid;
        console.log(`categoryid =${categoryid}`);
        const data = await db.query(sql, [
          title,
          description,
          price,
          userid,
          categoryid,
          publishdate,
          req.params.id,
        ]);
        return res.redirect("/ads");
      } else {
      }
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
      res.redirect("/ads");
    } catch (err) {
      console.log(err.stack);
    }
  });

  return router;
};
