Feature: Library Book Management
  As a reader
  I want to manage books after uploading them
  So that I can organize my library

  Background:
    Given the library page is open

  Scenario: Uploading a duplicate book shows an info message
    When I upload "crime-punishment.epub" via file input
    Then I should see 1 book card
    When I upload "crime-punishment.epub" via file input again
    Then I should see an info message saying it is already in the library
    And the book count should remain 1

  Scenario: Info message can be dismissed
    When I upload "crime-punishment.epub" via file input
    Then I should see 1 book card
    When I upload "crime-punishment.epub" via file input again
    Then the info message should be visible
    When I dismiss the info message
    Then the info message should not be visible

  Scenario: Long press shows delete confirmation sheet
    When I upload "accessible_epub_3.epub" via file input
    Then I should see 1 book card
    When I long-press the book card
    Then a confirmation sheet should appear asking to delete "Accessible EPUB 3"
    And the sheet should have delete and cancel buttons

  Scenario: Confirming deletion removes the book
    When I upload "accessible_epub_3.epub" via file input
    Then I should see 1 book card
    When I long-press the book card
    And I confirm the deletion in the sheet
    Then there should be no book cards

  Scenario: Canceling deletion dismisses the sheet
    When I upload "accessible_epub_3.epub" via file input
    Then I should see 1 book card
    When I long-press the book card
    And I cancel the deletion in the sheet
    Then the sheet should be dismissed
    And the book card should remain
