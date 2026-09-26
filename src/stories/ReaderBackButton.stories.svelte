<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from '@storybook/test';
	import ReaderBackButton from '$lib/components/ReaderBackButton.svelte';

	const { Story } = defineMeta({
		title: 'Reader/ReaderBackButton',
		component: ReaderBackButton,
		tags: ['autodocs'],
		parameters: {
			layout: 'fullscreen'
		},
		argTypes: {
			chapterTitle: { control: 'text' },
			direction: { control: 'select', options: ['back', 'forward'] },
			onBack: { action: 'back' }
		},
		args: {
			chapterTitle: 'Глава 3. Методы',
			direction: 'back',
			onBack: fn()
		}
	});
</script>

<script lang="ts">
	import { expect, userEvent } from '@storybook/test';
	import ReaderOverlay from '$lib/components/ReaderOverlay.svelte';

	const TEXT =
		'Взаимодействия через границы локальных процессов связаны с обращением к системным вызовам, ' +
		'маршалингом и декодированием данных, а также переключением контекстов и обходятся умеренно ' +
		'дорого. Количество таких взаимодействий следует тщательно ограничивать. Самыми надёжными ' +
		'являются границы служб: часто служба — это процесс, который запускается из командной строки ' +
		'или с помощью эквивалентного системного вызова.';
</script>

<!-- Default: короткое название главы -->
<Story name="ShortTitle" asChild>
	<div class="stage">
		<p class="text">{TEXT}</p>
		<ReaderBackButton chapterTitle="Глава 3. Методы" onBack={fn()} />
	</div>
</Story>

<!-- Длинное название обрезается многоточием -->
<Story name="LongTitle" asChild>
	<div class="stage">
		<p class="text">{TEXT}</p>
		<ReaderBackButton
			chapterTitle="Глава 12. Архитектура и её значение в современных распределённых системах"
			onBack={fn()}
		/>
	</div>
</Story>

<!-- Название без номера главы (например, переход по сноске внутри одной главы) -->
<Story name="WithoutChapterNumber" asChild>
	<div class="stage">
		<p class="text">{TEXT}</p>
		<ReaderBackButton chapterTitle="Примечания" onBack={fn()} />
	</div>
</Story>

<!-- Пустое название: кнопка остаётся кликабельной, но без текста -->
<Story name="EmptyTitle" asChild>
	<div class="stage">
		<p class="text">{TEXT}</p>
		<ReaderBackButton chapterTitle="" onBack={fn()} />
	</div>
</Story>

<!-- Клик вызывает onBack с текущим названием главы -->
<Story
	name="Interaction"
	args={{
		chapterTitle: 'Глава 7. Сервисы',
		onBack: fn()
	}}
	play={async ({ args }) => {
		const button = document.querySelector('[data-testid="reader-back-button"]');
		await userEvent.click(button as Element);
		await expect(args.onBack).toHaveBeenCalledTimes(1);
	}}
/>

<!-- Цель впереди по книге (переход из «Примечаний» в текст): стрелка вправо, якорь справа -->
<Story name="ForwardDirection" asChild>
	<div class="stage">
		<p class="text">{TEXT}</p>
		<ReaderBackButton
			chapterTitle="Глава 7. Сервисы и их границы"
			direction="forward"
			onBack={fn()}
		/>
	</div>
</Story>

<!-- Реальный контекст: хедер ридера открыт (режим меню) -->
<Story name="InMenuContext" asChild>
	<div class="stage">
		<p class="text">{TEXT}</p>
		<ReaderOverlay
			show={true}
			onBack={fn()}
			onShowToc={fn()}
			onUploadBook={fn().mockResolvedValue(undefined)}
		/>
		<ReaderBackButton
			chapterTitle="Глава 12. Архитектура и её значение в современных распределённых системах"
			onBack={fn()}
		/>
	</div>
</Story>

<!-- Тот же контекст, но возврат ведёт вперёд по книге -->
<Story name="InMenuContextForward" asChild>
	<div class="stage">
		<p class="text">{TEXT}</p>
		<ReaderOverlay
			show={true}
			onBack={fn()}
			onShowToc={fn()}
			onUploadBook={fn().mockResolvedValue(undefined)}
		/>
		<ReaderBackButton chapterTitle="Примечания" direction="forward" onBack={fn()} />
	</div>
</Story>

<style>
	.stage {
		position: relative;
		min-height: 100dvh;
		background: var(--color-readerBackground);
		padding: 90px 26px 120px;
	}

	.text {
		margin: 0;
		font-family: Georgia, 'Literata', serif;
		font-size: var(--font-size-reader-text);
		line-height: 1.75;
		color: var(--color-readerText);
		text-align: justify;
	}
</style>
