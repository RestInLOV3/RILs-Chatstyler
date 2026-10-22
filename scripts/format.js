// 메시지 본문 변환: 마크다운 강조, Roll20 스타일 텍스트, 단독 이미지 링크

// 마크다운 강조
// *** 를 먼저 처리해야 ** 나 * 로 잘못 변환되지 않음
// 주의: 중첩되거나 복잡한 마크다운 문법에는 완벽하게 작동하지 않을 수 있음
const EMPHASIS = [
  [/\*\*\*(.+?)\*\*\*/g, "<b><i>$1</i></b>"],
  [/\*\*(.+?)\*\*/g, "<b>$1</b>"],
  [/\*(.+?)\*/g, "<i>$1</i>"],
];

// Roll20 스타일 텍스트: [내용](#" style="...)
// 스타일 안의 rgba(), url() 같은 괄호 한 겹까지 허용하고, 닫는 따옴표는 있어도 없어도 됨
const STYLED_TEXT = /\[([^\]]+)\]\(#"\s*style="((?:[^"()]|\([^"()]*\))+)"?\s*\)/g;

// 메시지 전체가 이미지 주소 하나뿐인 경우
const IMAGE_URL_ONLY = /^https?:\/\/\S+\.(?:png|jpe?g|gif|webp|bmp)(?:\?\S*)?$/i;

// 이 요소들 안의 텍스트는 건드리지 않음 (링크, 코드, 주사위 결과, 시스템 채팅 카드)
const SKIP_SELECTOR = "a, code, pre, script, style, .inline-roll, .dice-roll, .chat-card";

/**
 * 메시지 본문(.message-content)을 제자리에서 변환한다.
 * 텍스트 노드만 바꾸므로 시스템이 넣은 HTML 구조나 이벤트는 그대로 남는다.
 * @param {HTMLElement} content
 */
export function formatMessageContent(content) {
  if (replaceWithImage(content)) return;
  for (const node of collectTextNodes(content)) formatTextNode(node);
}

function replaceWithImage(content) {
  const url = content.textContent.trim();
  if (!IMAGE_URL_ONLY.test(url)) return false;

  const image = document.createElement("img");
  image.className = "rils-chatstyler-image";
  image.src = url;
  content.replaceChildren(image);
  return true;
}

function collectTextNodes(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) =>
      node.parentElement.closest(SKIP_SELECTOR) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
  });

  // 순회 중에 노드를 바꾸면 순회가 꼬이므로 먼저 모아 둠
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  return nodes;
}

function formatTextNode(node) {
  const text = node.nodeValue;
  if (!text.includes("*") && !text.includes("](#")) return;

  // 사용자가 입력한 텍스트를 HTML로 해석하지 않도록 먼저 이스케이프
  // (따옴표는 Roll20 문법에 쓰이므로 그대로 둠 — 아래에서 따옴표 안에만 넣으므로 안전)
  const escaped = escapeHTML(text);
  let html = escaped;
  for (const [pattern, replacement] of EMPHASIS) html = html.replace(pattern, replacement);
  html = html.replace(STYLED_TEXT, renderStyledText);
  if (html === escaped) return;

  const template = document.createElement("template");
  template.innerHTML = html;
  node.replaceWith(template.content);
}

// Roll20처럼 <a> 태그로 만들어 링크 기본 모양까지 똑같이 맞춤
// 클릭 방지는 CSS(.rils-chatstyler-styled)에서 처리
function renderStyledText(match, text, style) {
  return `<a href="#" class="rils-chatstyler-styled" style="${style.trim()}">${text}</a>`;
}

function escapeHTML(text) {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
