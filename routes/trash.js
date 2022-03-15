router.get("/home", isLoggedIn, async function (req, res, next) {
  console.log(`Masuk router.get /home di index.js`);
  try {
    const field = ["name"];

    const sortBy = field.includes(req.query.sortBy) ? req.query.sortBy : "id";
    const sortMode = req.query.sortMode === "desc" ? "desc" : "asc";
    const url = req.url == "/" ? "/?page=1&sortBy=id&sortMode=asc" : req.url;

    req.query.sortBy = sortBy;
    req.query.sortMode = sortMode;

    // const { idgambar, pilkategori } = req.query;

    let params = [];
    let values = [];
    let count = 1;

    const page = req.query.page || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    let sql = "select count(*) as total from ads";
    if (params.length > 0) {
      sql += ` where ${params.join(" and")}`;
    }

    const totalResult = await db.query(sql, values);
    const pages = Math.ceil(totalResult.rows[0].total / limit);

    sql = `select * from ads`;
    if (params.length > 0) {
      sql += ` where ${params.join(" and ")}`;
    }

    sql += ` order by ${sortBy} ${sortMode} limit ${limit} offset ${offset}`;

    const data = await db.query(sql, values);
    console.log(`req.session.user =${JSON.stringify(req.session.user)}`);
    if (req.session.user) {
      userIn = true;
      if (req.session.user.roll == "admin") {
        userRoll = "admin";
      }
    }
    sql = `select * from categories`;
    const dataCategories = await db.query(sql, values);
    // console.log(`data.rows[0].pictures =${data.rows[0].pictures}`);
    // console.log(`data.rows =${JSON.stringify(data.rows)}`);
    res.render("index", {
      title: "Home ULX",
      data: data.rows,
      moment,
      pagination: {
        page: Number(page),
        pages,
        url,
      },
      dataCategories,
      currencyFormatter,
      currencyFormat,
      userIn,
      user: {
        name: req.session.user.fullname,
        email: req.session.user.email,
        roll: req.session.user.roll,
      },
      query: req.query,
    });
  } catch (err) {
    console.log(err.stack);
  }
});
