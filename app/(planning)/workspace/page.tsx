"use client";

import { useCallback, useState } from "react";
import styles from "./page.module.css";
import { UnifiedPlanningTable } from "../../components/unified-planning-table/UnifiedPlanningTable";
import { Button } from "../../components/Button";
import { PageState } from "../../components/PageState";
import { WorkspaceHeader, EventNavigator, LocationTagBar } from "../../components/workspace";
import { FilterBar } from "../../components/FilterBar";
import { LocationFilter } from "../../components/LocationFilter";
import { EventFilter } from "../../components/EventFilter";
import { UnifiedDateRangeButton } from "../../components/UnifiedDateRangeButton";
import { useTooltipPreference } from "../../components/TooltipToggle";
import { SegmentedControl } from "../../components/SegmentedControl";
import { usePlanningFilters } from "../../components/usePlanningFilters";
import {
  useToast,
  useFilterAlerts,
  useEventNavigation,
  useDateNavigation,
  useAllocations,
  useWorkspaceData,
} from "../../hooks";

interface LocationTagGroup {
  name: string;
  locationIds: string[];
}

export default function WorkspacePage() {
  const {
    events,
    workCategories,
    locations,
    eventLocations,
    allocations,
    evaluation,
    crossEventEvaluation,
    isLoading,
    error,
    setAllocations,
    setError,
    refreshCrossEventEvaluation,
  } = useWorkspaceData();

  const [locationTagGroups, setLocationTagGroups] = useState<LocationTagGroup[]>([]);

  const {
    drafts,
    errorsByCellKey,
    startCreate: startCreateAllocation,
    startEdit: startEditAllocation,
    changeDraft,
    commitDraft,
    cancelDraft,
    deleteAllocation,
  } = useAllocations({
    allocations,
    setAllocations,
    workCategories,
    onEvaluationRefresh: refreshCrossEventEvaluation,
    onError: setError,
  });
  const [tooltipsEnabled, setTooltipsEnabled] = useTooltipPreference();
  const { message: toastMessage, showToast, hideToast } = useToast();

  const {
    selectedLocationIds,
    setSelectedLocationIds,
    selectedEventIds,
    setSelectedEventIds,
    dateRangePreset,
    customDateRange,
    selectedYear,
    selectedMonth,
    monthOffset,
    availableYears,
    activeDateRange,
    isRangeLocked,
    setIsRangeLocked,
    filteredData,
    dates,
    hasSelectionFilters,
    eventIdsForSelectedLocations,
    eventIdsInActiveDateRange,
    handlePresetChange,
    handleCustomRangeChange,
    handleYearChange,
    handleMonthChange,
    handlePreviousMonth,
    handleNextMonth,
    handleYearMonthPrevious,
    handleYearMonthNext,
  } = usePlanningFilters({
    events,
    locations,
    workCategories,
    eventLocations,
    allocations,
    evaluation,
    drafts,
    errorsByCellKey,
  });

  const {
    focusedEventId,
    hasSelection: hasNavigationSelection,
    canGoPrevious: canLocatePrevious,
    canGoNext: canLocateNext,
    label: navigatorLabel,
    title: navigatorTitle,
    goToPrevious: handleLocatePrevious,
    goToNext: handleLocateNext,
    reset: resetNavigation,
  } = useEventNavigation({ events, selectedEventIds });

  useFilterAlerts({
    filteredEventsCount: filteredData.events.length,
    selectedEventIds,
    selectedLocationIds,
    activeDateRange,
    isRangeLocked,
    eventIdsForSelectedLocations,
    eventIdsInActiveDateRange,
    toastMessage,
    showToast,
    hideToast,
  });

  const handleClearFilters = useCallback(() => {
    setSelectedEventIds(new Set());
    setSelectedLocationIds(new Set());
    resetNavigation();
  }, [resetNavigation]);

  const {
    canGoYearMonthPrevious,
    canGoYearMonthNext,
    goToYearMonthPrevious: handleYearMonthPreviousWithAlert,
    goToYearMonthNext: handleYearMonthNextWithAlert,
    goToOffsetPrevious: handlePreviousMonthWithAlert,
    goToOffsetNext: handleNextMonthWithAlert,
  } = useDateNavigation({
    selectedYear,
    selectedMonth,
    availableYears,
    onYearMonthPrevious: handleYearMonthPrevious,
    onYearMonthNext: handleYearMonthNext,
    monthOffset,
    onOffsetPrevious: handlePreviousMonth,
    onOffsetNext: handleNextMonth,
    onBlocked: showToast,
  });

  return (
    <PageState
      loading={isLoading}
      error={error}
      empty={events.length === 0}
      loadingMessage="Loading workspace..."
      emptyMessage="No active events"
    >
    <div className={styles.pageContainer}>
      <div className={styles.toolbar}>
        <WorkspaceHeader
          tooltipsEnabled={tooltipsEnabled}
          onTooltipsChange={setTooltipsEnabled}
        />

        {(events.length > 0 || locations.length > 0) && (
          <>
            <FilterBar>
              <SegmentedControl
                style={{
                  flexWrap: "wrap",
                  gap: "var(--space-sm)",
                }}
              >
                {events.length > 0 && (
                  <EventFilter
                    events={events}
                    selectedEventIds={selectedEventIds}
                    onSelectionChange={setSelectedEventIds}
                  />
                )}
                {locations.length > 0 && (
                  <LocationFilter
                    locations={locations}
                    selectedLocationIds={selectedLocationIds}
                    onSelectionChange={setSelectedLocationIds}
                    onTagsChange={setLocationTagGroups}
                  />
                )}
                <Button
                  onClick={handleClearFilters}
                  disabled={!hasSelectionFilters}
                  variant="segmented"
                  size="sm"
                  style={{
                    padding: "6px 14px",
                    opacity: hasSelectionFilters ? 1 : 0.6,
                  }}
                >
                  Clear Filters
                </Button>
              </SegmentedControl>
              <UnifiedDateRangeButton
                selectedPreset={dateRangePreset}
                customRange={customDateRange}
                onPresetChange={handlePresetChange}
                onCustomRangeChange={handleCustomRangeChange}
                availableYears={availableYears}
                selectedYear={selectedYear}
                selectedMonth={selectedMonth}
                onYearChange={handleYearChange}
                onMonthChange={handleMonthChange}
                activeDateRange={activeDateRange}
                isRangeLocked={isRangeLocked}
                onRangeLockChange={setIsRangeLocked}
                monthOffset={monthOffset}
                onPreviousMonth={handlePreviousMonthWithAlert}
                onNextMonth={handleNextMonthWithAlert}
                onYearMonthPrevious={handleYearMonthPreviousWithAlert}
                onYearMonthNext={handleYearMonthNextWithAlert}
                yearMonthPrevDisabled={!canGoYearMonthPrevious}
                yearMonthNextDisabled={!canGoYearMonthNext}
              />
              {hasNavigationSelection && (
                <EventNavigator
                  canGoPrevious={canLocatePrevious}
                  canGoNext={canLocateNext}
                  label={navigatorLabel}
                  title={navigatorTitle}
                  onPrevious={handleLocatePrevious}
                  onNext={handleLocateNext}
                />
              )}
            </FilterBar>

            <LocationTagBar
              groups={locationTagGroups}
              selectedLocationIds={selectedLocationIds}
              onSelectionChange={setSelectedLocationIds}
            />

          </>
        )}
      </div>

      {/* Unified Planning Table - Single scroll container */}
      <div className={styles.tableContainer}>
        <UnifiedPlanningTable
          events={filteredData.events}
          locations={filteredData.locations}
          eventLocations={filteredData.eventLocations}
          dates={dates}
          workCategories={filteredData.workCategories}
          allocations={filteredData.allocations}
          evaluation={filteredData.evaluation}
          crossEventEvaluation={crossEventEvaluation}
          drafts={filteredData.drafts}
          errorsByCellKey={filteredData.errorsByCellKey}
          tooltipsEnabled={tooltipsEnabled}
          focusedEventId={focusedEventId}
          onLocateFailure={showToast}
          onStartCreate={startCreateAllocation}
          onStartEdit={startEditAllocation}
          onChangeDraft={changeDraft}
          onCommit={commitDraft}
          onCancel={cancelDraft}
          onDelete={deleteAllocation}
        />
      </div>
      {toastMessage && (
        <div role="status" aria-live="polite" className={styles.toast}>
          {toastMessage}
        </div>
      )}
    </div>
    </PageState>
  );
}
