import $ from "jquery";
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const container = $(".results__container")

let lastY: number
let offset = 0
let lastScrollTop = 0

container.on("touchstart", (e) => {
  lastY = e.touches[0].clientY
})

container.on("touchmove", (e) => {
  if (window.innerWidth > 1000) {
    container.css("transform", "none")
    return
  }

  const currY = e.touches[0].clientY
  const dist = lastY - currY;
  lastY = currY;
  const maxOffset = container.height()! * 2 * .30;

  if (container.scrollTop() == 0) {
    offset += dist;
    e.preventDefault();
  }

  if (offset > maxOffset) {
    container.scrollTop(container.scrollTop()! + dist)
    offset = maxOffset;
  }

  if (offset < 0) {
    offset = 0;
  }

  container.css("transform", `translateY(calc(-${offset}px + 30vh))`)
})

container.on("wheel", () => {

  if (window.innerWidth > 1000) {
    container.css("transform", "none")
    return
  }

  const dist = container.scrollTop()! - lastScrollTop;
  lastScrollTop = container.scrollTop()!;
  const maxOffset = container.height()! * 2 * .30;

  if (offset < maxOffset && dist > 0) {
    offset += dist;
  }

  if (offset > 0 && dist < 0 && container.scrollTop()! < 500) {
    offset += dist;
  }

  if (offset > maxOffset) {
    container.scrollTop(container.scrollTop()! + dist)
    offset = maxOffset;
  }

  if (offset < 0) {
    offset = 0;
  }

  container.css("transform", `translateY(calc(-${offset}px + 30vh))`)

})


export function resetOffset(){

  if (window.innerWidth > 1000) {
    container.css("transform", "none")
    return
  }

  offset = 0;
  container.css("transform", `translateY(calc(-${offset}px + 30vh))`)
}
