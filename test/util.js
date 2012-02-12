module("util.js");

test("pivot.util.makeElement", function () {
  var el = pivot.util.makeElement("div");

  equals(el.nodeType, 1);
  equals(el.tagName.toLowerCase(), "div");

  el = pivot.util.makeElement("p", {
    "class": "paragraph",
    "title": "woot"
  });

  equals(el.className, "paragraph");
  equals(el.getAttribute("title"), "woot");
});

test("pivot.util.supplant", function () {
  var supplant = pivot.util.supplant;

  var someString = "this {var1} a {var2} string";
  equal("this is a test string", supplant(someString, "is", "test"));
  equal("this is a test string", supplant(someString, { var1: "is", var2: "test" }));

  equal("this is a {var2} string", supplant(someString, "is"));
  equal("this {var1} a test string", supplant(someString, { var2: "test" }));

  someString = "{var1} a {var2}";
  equal("is a test", supplant(someString, "is", "test"));
  equal("is a test", supplant(someString, { var1: "is", var2: "test" }));

  equal("is a {var2}", supplant(someString, "is"));
  equal("{var1} a test", supplant(someString, { var2: "test" }));
});

asyncTest("pivot.util.getJSON", function () {
  pivot.util.getJSON("test.json", function(data){
   equal("yep", data.json);
   start();
  });
});

asyncTest("pivot.util.localCoordinates without scroll", function () {
  var localCoordinates = pivot.util.localCoordinates;

  var forceScroll = pivot.util.makeElement("div");
  forceScroll.style.cssText = "width: 5000px; height: 5000px; position: absolute; top: 20px; left: 10px;";
  document.body.appendChild(forceScroll);

  forceScroll.addEventListener("click", function (event) {
    var pos = localCoordinates(event);
    equal(0, pos.x);
    equal(0, pos.y);
    start();
    document.body.removeChild(forceScroll);
  }, false);

  click(forceScroll, 10, 20);

});

asyncTest("pivot.util.localCoordinates with scroll", function () {
  var localCoordinates = pivot.util.localCoordinates;

  var forceScroll = pivot.util.makeElement("div");
  forceScroll.style.cssText = "width: 5000px; height: 5000px; position: absolute; top: 20px; left: 10px;";
  document.body.appendChild(forceScroll);
  window.scrollTo(10, 10);

  // Sanity check
  equal(10, window.pageXOffset, "pageXOffset correctness");
  equal(10, window.pageYOffset, "pageYOffset correctness");

  forceScroll.addEventListener("click", function (event) {
    var pos = localCoordinates(event);
    equal(10 / 5000, pos.x);
    equal(10 / 5000, pos.y);
    start();
    document.body.removeChild(forceScroll);
  }, false);

  click(forceScroll, 10, 20);

});

test("pivot.util.mod", function () {
  equal(5, pivot.util.mod(5, 7));
  equal(1, pivot.util.mod(8, 7));
  equal(2, pivot.util.mod(-3, 5));
});

test("Element.prototype.classList", function () {
  var element = document.createElement("div");

  element.classList.add("test");
  equal("test", element.className);

  element.classList.add("test2");
  element.classList.remove("test");
  equal("test2", element.className);

  ok(!element.classList.contains("test"));
  ok(element.classList.contains("test2"));

  element.classList.toggle("test2");
  ok(!element.classList.contains("test2"));
});
