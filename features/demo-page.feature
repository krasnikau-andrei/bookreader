Feature: Demo Playwright Page
  As a developer
  I want the demo page to render correctly
  So that Playwright testing infrastructure works

  Scenario: Demo page has a heading
    Given I navigate to the demo page
    Then an h1 heading should be visible
