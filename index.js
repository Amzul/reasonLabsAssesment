console.log(
    fn("hello").fn("world").fn("!!!").fn()
)
//Will print: hello world !!!
console.log(
    fn("This").fn("is").fn("just").fn("a").fn("test").fn()
)
//Will print: This is just a test
function fn (str) {
    /** YOUR CODE GOES HERE /**/
    return {
        fn: function (nextStr) {
          if (!nextStr) return str
          return fn([str, nextStr].join(' '))
        }
    }
}
