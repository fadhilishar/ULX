let a = function () {
  let bilangan = 2;
  return function () {
    return ++bilangan;
  };
};

console.log(a()());
