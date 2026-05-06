Feature: TOC Chapter Switch Scroll Bug
  As a developer
  I want to verify that switching chapters via TOC resets the scroll position
  So that each chapter opens at the beginning

  Background:
    Given the library page is open
    And a book "crime-punishment.epub" is uploaded
    And I open the book in the reader

  Scenario: Switching chapters via TOC resets scroll position to 0
    When I navigate to chapter 2 and scroll within it
    Then the scroll position should be greater than 0
    When I open the TOC and click on chapter 5
    Then the TOC should close
    And the URL should show the new chapter
    And the scroll position should be 0
