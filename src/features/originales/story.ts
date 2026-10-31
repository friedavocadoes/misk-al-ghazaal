/** Editorial mood, not ingredient, longevity, provenance or manufacturing claims. */
export const COLLECTION_STORY = {
  en: {
    lead: "Some things are felt\nbefore they are understood.",
    body: "The light in a room. The pause in a conversation. The presence of someone who has nothing to prove. Originales is an exploration of that quiet certainty: four expressions of individuality, each with its own atmosphere, each leaving room for yours.",
    close: "A fragrance should feel like recognition.",
  },
  ar: {
    lead: "أشياء نشعر بها\nقبل أن نفهمها.",
    body: "ضوء يملأ المكان. لحظة صمت في حديث. حضور شخص لا يحتاج إلى إثبات شيء. أوريجينال تأمّل في هذا اليقين الهادئ: أربعة تعابير للشخصية، لكل منها عالمه الخاص، ولكل منها مساحة لك.",
    close: "عطر يشبه لحظة اكتشاف ذاتك.",
  },
};
export const EDITION_STORIES: Record<
  string,
  {
    en: { heading: string; body: string };
    ar: { heading: string; body: string };
  }
> = {
  ambrato: {
    en: {
      heading: "The warmth you leave behind.",
      body: "The last light through an open window. A room that feels more intimate as the evening unfolds. Ambrato is an invitation to inhabit that golden hour — unhurried, assured, entirely at ease.",
    },
    ar: {
      heading: "دفء يبقى بعد الرحيل.",
      body: "آخر خيط ضوء يعبر نافذة مفتوحة. مكان يزداد حميمية مع اقتراب المساء. أمبراتو دعوة للعيش في تلك الساعة الذهبية، بهدوء وثقة وراحة تامة.",
    },
  },
  sultanic: {
    en: {
      heading: "Quiet, with conviction.",
      body: "A shaded courtyard. The stillness between city and sanctuary. Sultanic belongs to a world where strength is measured in composure, and the most memorable entrance is the one that never asks for attention.",
    },
    ar: {
      heading: "هدوء يحمل يقيناً.",
      body: "فناء تظلّله الأشجار. سكينة بين صخب المدينة وملاذها. سلطانيك ينتمي إلى عالم تُقاس فيه القوة بالاتزان، ويترك فيه الحضور أثره دون أن يطلب الانتباه.",
    },
  },
  lustra: {
    en: {
      heading: "An intimacy that lingers.",
      body: "The conversation that lasts beyond midnight. A detail noticed only up close. Lustra is a portrait of the personal — expressive without explanation, remembered for the way it made a moment feel.",
    },
    ar: {
      heading: "قرب يترك أثره.",
      body: "حديث يمتد إلى ما بعد منتصف الليل. تفصيل لا يُرى إلا عن قرب. لاسترا صورة لما هو شخصي: تعبير بلا شرح، يبقى في الذاكرة بما أضفاه على اللحظة.",
    },
  },
  lazvaro: {
    en: {
      heading: "A different kind of clarity.",
      body: "An open horizon. The first quiet moment of a day that is still yours to shape. Lazvaro is an expression of possibility — composed, clear, and drawn to what lies beyond the familiar.",
    },
    ar: {
      heading: "صفاء من نوع آخر.",
      body: "أفق مفتوح. أول لحظة هادئة من يوم ما زال ملكك. لازفارو تعبير عن الإمكان: متزن وصافٍ، يتطلع إلى ما وراء المألوف.",
    },
  },
};
export function editionStory(name: string, ar: boolean) {
  return EDITION_STORIES[name.toLowerCase()]?.[ar ? "ar" : "en"];
}
