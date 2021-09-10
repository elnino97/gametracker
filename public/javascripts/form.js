const recommended = document.querySelector('.recommended');
const notRecommended = document.querySelector('.not-recommended');
recommended.addEventListener('click', () => {
    if (!recommended.classList.contains('recommended-selected')){
        recommended.classList.add('recommended-selected')
        notRecommended.classList.remove('not-recommended-selected')
    }
})
notRecommended.addEventListener('click', () => {
    if (!notRecommended.classList.contains('not-recommended-selected')){
        notRecommended.classList.add('not-recommended-selected')
        recommended.classList.remove('recommended-selected')
    }
})

const input1 = document.getElementById('1')
const input2 = document.getElementById('2')
const input3 = document.getElementById('3')
input1.value = "";
input2.value = "";
input3.value = "";