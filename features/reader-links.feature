Feature: Reader Internal Links
  As a reader
  I want links in EPUBs to work correctly
  So that I can navigate between chapters and access external resources

  Background:
    Given the database is cleared

  Scenario: Links are transformed correctly
    When I upload "accessible_epub_3.epub" via file chooser and open it
    Then there should be internal links with proper chapter attributes
    And internal links should have href set to "javascript:void(0)"
    And each internal link should reference a valid chapter

  Scenario: Internal link click navigates to the correct chapter
    When I upload "accessible_epub_3.epub" via file chooser and open it
    And I navigate to a chapter with internal links
    When I click an internal link to a different chapter
    Then the chapter should have changed

  Scenario: Missing link shows an error popup
    When I upload "accessible_epub_3.epub" via file chooser and open it
    And I navigate to a chapter with internal links
    When I click a missing link
    Then an error popup should appear
    And the popup should reference the original link

  Scenario: External links open in a new tab
    When I upload "accessible_epub_3.epub" via file chooser and open it
    And I navigate to a chapter with external links
    Then external links should have target "_blank"
    And external links should have rel "noopener"
    And external links should point to http URLs

  Scenario: Internal link with fragment scrolls to the target element
    When I upload "accessible_epub_3.epub" via file chooser and open it
    And I navigate to a chapter with internal links
    When I click an internal link with a fragment to another chapter
    Then the chapter should have changed
    And the fragment element should exist in the new chapter
    And the fragment element should be visible in the viewport
