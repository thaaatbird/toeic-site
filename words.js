let words = [];
let currentPos = "all";

const posLabel = { n: "명사", v: "동사", adj: "형용사", adv: "부사" };

const searchInput = document.getElementById("search-input");
const filterButtons = document.querySelectorAll(".filter-btn");
const wordList = document.getElementById("word-list");
const wordCount = document.getElementById("word-count");

async function loadWords() {
  try {
    const response = await fetch("words.json");
    words = await response.json();
    renderWords();
  } catch (error) {
    wordCount.textContent = "단어를 불러오지 못했습니다.";
    console.error(error);
  }
}

function renderWords() {
  const keyword = searchInput.value.trim().toLowerCase();

  const filtered = words.filter((item) => {
    const matchPos = currentPos === "all" || item.pos === currentPos;
    const matchKeyword =
      item.word.toLowerCase().includes(keyword) || item.meaning.includes(keyword);
    return matchPos && matchKeyword;
  });

  wordList.innerHTML = "";
  filtered.forEach((item) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span><strong>${item.word}</strong> <span class="pos">${posLabel[item.pos]}</span></span>
      <span>${item.meaning}</span>
    `;
    wordList.appendChild(li);
  });

  wordCount.textContent = filtered.length
    ? `${filtered.length}개 / 전체 ${words.length}개`
    : "검색 결과가 없습니다.";
}

searchInput.addEventListener("input", renderWords);

filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    filterButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentPos = btn.dataset.pos;
    renderWords();
  });
});

loadWords();