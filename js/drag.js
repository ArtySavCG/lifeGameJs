document.addEventListener('DOMContentLoaded', function () {
    const draggableElements = document.querySelectorAll('.draggable');

    draggableElements.forEach(draggableElement => {
        let offsetX, offsetY, isDragging = false;

        draggableElement.addEventListener('mousedown', function (e) {
            isDragging = true;
            offsetX = e.clientX - draggableElement.getBoundingClientRect().left;
            offsetY = e.clientY - draggableElement.getBoundingClientRect().top;
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });

        function onMouseMove(e) {
            if (isDragging) {
                draggableElement.style.left = `${e.clientX - offsetX}px`;
                draggableElement.style.top = `${e.clientY - offsetY}px`;
            }
        }

        function onMouseUp() {
            isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }
    });
});