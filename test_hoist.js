function a() { console.log(1); }
const _origA = a;
function a() { _origA(); console.log(2); }
a();
