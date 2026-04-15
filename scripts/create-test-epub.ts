import JSZip from 'jszip';
import fs from 'fs';
import path from 'path';

async function createTestEpub() {
	const zip = new JSZip();

	// mimetype file
	zip.file('mimetype', 'application/epub+zip');

	// container.xml
	zip.file(
		'META-INF/container.xml',
		`<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
<rootfiles>
<rootfile full-path="content.opf" media-type="application/oebps-package+xml"/>
</rootfiles>
</container>`
	);

	// Chapter 1
	zip.file(
		'chapter1.xhtml',
		`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<title>Chapter 1</title>
</head>
<body>
<h1>Chapter 1: The Beginning</h1>
<p>This is the first chapter of our test book. It contains multiple paragraphs of text to test the reader functionality.</p>
<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
<p>Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
<p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</p>
<p>Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
<p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.</p>
<p>Totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.</p>
<p>Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.</p>
<p>Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit.</p>
<p>Sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem.</p>
<p>Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur?</p>
<p>Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur.</p>
<p>Vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?</p>
<p>At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti.</p>
<p>Quos dolores et quas molestias excepturi sint occaecati cupiditate non provident.</p>
<p>Similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga.</p>
<p>Et harum quidem rerum facilis est et expedita distinctio.</p>
<p>Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus.</p>
<p>Omnis voluptas assumenda est, omnis dolor repellendus.</p>
<p>Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae.</p>
<p>Itaque earum rerum hic tenetur a sapiente delectus, ut aut reiciendis voluptatibus maiores alias consequatur aut perferendis doloribus asperiores repellat.</p>
</body>
</html>`
	);

	// Chapter 2
	zip.file(
		'chapter2.xhtml',
		`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<title>Chapter 2</title>
</head>
<body>
<h1>Chapter 2: The Middle</h1>
<p>This is the second chapter of our test book. More content here for testing pagination.</p>
<p>Second chapter content with multiple paragraphs to ensure we have enough text for testing.</p>
<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
<p>Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
<p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</p>
<p>Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
<p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.</p>
<p>Totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.</p>
<p>Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit.</p>
</body>
</html>`
	);

	// content.opf
	zip.file(
		'content.opf',
		`<?xml version="1.0" encoding="UTF-8"?>
<package version="3.0" xmlns="http://www.idpf.org/2007/opf">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:title>Test Reader Book</dc:title>
<dc:creator>Test Author</dc:creator>
<dc:identifier id="bookid">test-reader-id</dc:identifier>
<dc:language>en</dc:language>
</metadata>
<manifest>
<item id="chapter1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
<item id="chapter2" href="chapter2.xhtml" media-type="application/xhtml+xml"/>
</manifest>
<spine>
<itemref idref="chapter1"/>
<itemref idref="chapter2"/>
</spine>
</package>`
	);

	const buffer = await zip.generateAsync({ type: 'arraybuffer' });
	const outputPath = path.join(process.cwd(), 'tests', 'fixtures', 'test-reader.epub');
	fs.writeFileSync(outputPath, Buffer.from(buffer));
	console.log(`Created ${outputPath}`);
}

createTestEpub().catch(console.error);
