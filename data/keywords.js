// data/keywords.js
// Prompt-aware mode: maps keyword patterns → content tags.
// Tested against the lowercased last user prompt. First match wins.
// Tags must be from the allowed set: calm | funny | sport | focus
// If no pattern matches, a random clip is shown regardless of tag.

/* global */ var KEYWORDS = [
  {
    pattern: /\b(sport|sports|game|match|team|play|athlete|football|basketball|soccer|tennis|baseball|hockey|golf|running|fitness|gym|workout|exercise|train|race|marathon)\b/,
    tag: 'sport',
  },
  {
    pattern: /\b(calm|relax|meditat|breath|slow|peace|peaceful|quiet|zen|sleep|rest|nature|lofi|lo-fi|serene|gentle|sooth)\b/,
    tag: 'calm',
  },
  {
    pattern: /\b(funny|joke|meme|humor|humour|laugh|lol|comedy|hilarious|silly|absurd|ridiculous|witty|sarcas|ironic|parody)\b/,
    tag: 'funny',
  },
  {
    pattern: /\b(cat|cats|kitten|kitty|feline|meow)\b/,
    tag: 'cats',
  },
  {
    pattern: /\b(dog|dogs|puppy|puppies|canine|woof|golden retriever|labrador|corgi)\b/,
    tag: 'dogs',
  },
  {
    pattern: /\b(focus|code|coding|program|debug|work|study|studying|learn|learning|concentrate|deep.?work|flow|productivity|productive|research|write|writing)\b/,
    tag: 'focus',
  },
];
