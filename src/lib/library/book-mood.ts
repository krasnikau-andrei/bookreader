// First match wins, so specific codes go before generic ones:
// the FB2 code "romance_sf" is science fiction, not romance.
const MOODS: [RegExp, string][] = [
	[/(^|_)sf|science.?fiction|фантаст/i, '🚀'],
	[/fantasy|фэнтези/i, '🐉'],
	[/detective|mystery|thriller|детектив|триллер/i, '🔍'],
	[/horror|ужас/i, '🕯️'],
	[/humor|comedy|юмор|комеди/i, '😄'],
	[/drama|драм/i, '🎭'],
	[/love|romance|любов/i, '💔'],
	[/poetry|поэз|стих/i, '🪶'],
	[/histor|истор/i, '📜'],
	[/comp|programm|программ|software/i, '💻'],
	[/psycholog|психолог/i, '🧠'],
	[/business|бизнес|продуктивн/i, '📈'],
	[/classic|классик/i, '🏛️'],
	[/educat|образован|^sci_|science|наук/i, '🎓']
];

/** Emoji for the book's genre: from EPUB subjects first, then title keywords; '' when unsure. */
export function bookMood(subjects: string[], title: string): string {
	for (const subject of subjects) {
		for (const [re, emoji] of MOODS) if (re.test(subject)) return emoji;
	}
	for (const [re, emoji] of MOODS) if (re.test(title)) return emoji;
	return '';
}
