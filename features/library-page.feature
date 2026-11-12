Feature: Library Page
  As a reader
  I want to manage my book collection in the library
  So that I can organize and browse my books

  Background:
    Given the library page is open
    And the database is cleared

  Scenario: Empty state shows upload prompt
    Then I should see the empty state message
    And I should see the upload button
    And there should be no book cards

  Scenario: Theme background color is applied
    Then the page should have a theme background color

  Scenario: Upload button has accent color
    Then the upload button should have the accent color

  Scenario: Uploading a valid EPUB shows the book in the grid
    When I upload "great-gatsby.epub" via the file chooser button
    Then I should see 1 book card
    And the book should be titled "The Great Gatsby"
    And the book should be authored by "F. Scott Fitzgerald"

  Scenario: Uploading a PDF shows an error
    When I upload "invalid-format.pdf" via the file chooser button
    Then I should see an error message
    And there should be no book cards
    And the empty state should remain visible

  Scenario: Uploading a corrupted EPUB shows an error
    When I upload "corrupted.epub" via the file chooser button
    Then I should see an error message
    And there should be no book cards
    And the empty state should remain visible

  Scenario: Books persist after page reload
    When I upload "great-gatsby.epub" via the file chooser button
    Then I should see 1 book card
    When I reload the page
    Then the book "The Great Gatsby" should still be displayed

  Scenario: Multiple books appear in the grid
    When I upload "great-gatsby.epub" via the file chooser button
    Then I should see 1 book card
    When I upload "1984.epub" via the file chooser button
    Then I should see 2 book cards
    And the grid should contain "The Great Gatsby" and "1984"

  Scenario: Deleting a book removes it from the grid
    When I upload "great-gatsby.epub" via the file chooser button
    Then I should see 1 book card
    When I right-click the book to delete it
    Then the confirmation sheet should appear
    When I confirm the deletion
    Then the book should be removed from the grid
    And the empty state should be visible
    When I reload the page
    Then the book should still be gone

  Scenario: Book with cover displays cover image
    When I upload "book-with-cover.epub" via the file chooser button
    Then the book should display a cover image
    And it should not show a filename placeholder
    And the book should be titled "Book With Cover"
    And the book should be authored by "Test Author"

  Scenario: Book with a 1x1 placeholder cover gets a typographic cover
    When I upload "book-with-pixel-cover.epub" via the file chooser button
    Then the book should not display a cover image
    And it should show a filename placeholder containing ".epub"
    And the book should be titled "Book With Pixel Cover"

  Scenario: Book without cover displays filename placeholder
    When I upload "great-gatsby.epub" via the file chooser button
    Then the book should not display a cover image
    And it should show a filename placeholder containing ".epub"
    And the book should be titled "The Great Gatsby"
    And the book should be authored by "F. Scott Fitzgerald"

  Scenario: Clicking a book opens the reader and shows book content
    When I upload "crime-punishment.epub" via file input
    Then I should see 1 book card
    When I open the book from the library
    Then the reader should be visible
    And the reader should show the book content

  Scenario: Tapping a book card opens the reader via touch events
    When I upload "crime-punishment.epub" via file input
    Then I should see 1 book card
    When I touch-tap the book card
    Then the reader should be visible
    And the reader should show the book content
