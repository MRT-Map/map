container = $(".results__container")

var lastY
var offset = 0
var lastScrollTop = 0

container.on("touchstart", (e) => {
  lastY = e.touches[0].clientY
})

container.on("touchmove", (e) => {

  if (window.innerWidth > 1000) return

  currY = e.touches[0].clientY
  let dist = lastY - currY;
  lastY = currY;
  let maxOffset = container.height() * 2 * .30;

  if (container.scrollTop() == 0) {
    offset += dist;
    e.preventDefault();
  }

  if (offset > maxOffset) {
    container.scrollTop(container.scrollTop() + dist)
    offset = maxOffset;
  }

  if (offset < 0) {
    offset = 0;
  }

  container.css("transform", `translateY(calc(-${offset}px + 30vh))`)
})

container.on("wheel", e => {

  if (window.innerWidth > 1000) return

  let dist = container.scrollTop() - lastScrollTop;
  lastScrollTop = container.scrollTop();
  let maxOffset = container.height() * 2 * .30;

  if (offset < maxOffset && dist > 0) {
    offset += dist;
  }

  if (offset > 0 && dist < 0 && container.scrollTop() < 500) {
    offset += dist;
  }

  if (offset > maxOffset) {
    container.scrollTop(container.scrollTop() + dist)
    offset = maxOffset;
  }

  if (offset < 0) {
    offset = 0;
  }

  container.css("transform", `translateY(calc(-${offset}px + 30vh))`)

})
