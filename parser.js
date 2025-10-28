const msg = $json["body"]["entry"]["0"]["changes"]["0"]["value"]["messages"]["0"] || {};
const text = (msg.text?.body || "").trim();

const interactiveReplyId = msg.interactive?.list_reply?.id ?? null;
const interactiveReplyTitle = msg.interactive?.list_reply?.title ?? null;
const interactiveReplyDescription = msg.interactive?.list_reply?.description ?? null;

const rawNumber = msg.from || "";
let parsedPhoneNumber = rawNumber.replace(/[^\d]/g, "");

if (parsedPhoneNumber.length === 12) {
  parsedPhoneNumber = parsedPhoneNumber.slice(0,4) + "9" + parsedPhoneNumber.slice(4);
}
return [{ json: { 
  parsed_phone_number: `${parsedPhoneNumber}`,
  message_id: msg.id,
  type: msg.type,
  text: text.toUpperCase(),
  interactive_reply_id: interactiveReplyId,
  interactive_reply_title: interactiveReplyTitle,
  interactive_reply_description: interactiveReplyDescription
  } 
}];
