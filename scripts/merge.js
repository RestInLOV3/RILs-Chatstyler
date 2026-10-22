// 같은 화자의 연속 메시지를 화면에서만 하나처럼 붙여 보이게 함
// 실제 메시지 데이터는 건드리지 않으므로 각 메시지를 따로 수정·삭제할 수 있음

// 병합 상태를 나타내는 클래스 (styles/chat-styler.css 참고)
const MERGED = "visually-merged"; // 이전 메시지에 이어 붙는 메시지
const CONTINUED = "has-continuation"; // 다음 메시지가 이어 붙는 메시지
const START = "conversation-start"; // 대화 덩어리의 첫 메시지

// 채팅 카드, 주사위 결과 등 모양이 복잡한 메시지 (CoC7 카드도 .chat-card)
const COMPLEX_CONTENT_SELECTOR = ".chat-card, .dice-roll";

/** 화면에 있는 모든 채팅 목록의 병합 상태를 다시 계산한다. */
export function mergeChatMessages() {
  // 채팅 로그, 팝아웃, 알림 영역 등 메시지 목록마다 따로 처리
  const lists = new Set(
    Array.from(document.querySelectorAll(".chat-message"), (el) => el.parentElement)
  );
  for (const list of lists) {
    if (list) mergeMessageList(list);
  }
}

function mergeMessageList(list) {
  let previous = null; // 직전 메시지 요소 (연결이 끊기면 null)
  let previousSpeaker = null;

  for (const element of list.querySelectorAll(":scope > .chat-message")) {
    // 매번 처음부터 다시 계산하므로 이전 결과는 지움
    element.classList.remove(MERGED, CONTINUED, START);

    const message = game.messages.get(element.dataset.messageId);
    if (!message || shouldSkipMessage(message, element)) {
      previous = null;
      continue;
    }

    const speaker = getSpeakerKey(message);
    if (previous && speaker === previousSpeaker) {
      element.classList.add(MERGED);
      previous.classList.add(CONTINUED);
    } else {
      element.classList.add(START);
    }

    // 중간 메시지도 다음 메시지와 이어지도록 항상 직전 메시지를 기준으로 삼음
    previous = element;
    previousSpeaker = speaker;
  }
}

// 같은 사용자가 같은 이름으로 말한 경우만 같은 화자로 봄
function getSpeakerKey(message) {
  const alias = message.alias ?? message.speaker?.alias ?? "";
  return `${message.author?.id ?? ""}:${alias}`;
}

// 병합하지 않고 앞뒤 연결도 끊을 메시지
function shouldSkipMessage(message, element) {
  // 주사위 굴림
  if (message.rolls?.length > 0) return true;

  // sch-customize 모듈의 사담 메시지
  if (message.flags?.["sch-customize"]?.priv_talk) return true;

  const content = element.querySelector(".message-content");
  return !content || Boolean(content.querySelector(COMPLEX_CONTENT_SELECTOR));
}
