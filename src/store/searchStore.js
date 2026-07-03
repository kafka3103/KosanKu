/**
 * store/searchStore.js
 * Zustand store untuk state pencarian dan filter Tenant
 */

import { create } from 'zustand';

const useSearchStore = create((set) => ({
  // ── State Filter ──
  searchQuery: '',
  selectedCity: null,
  priceMin: null,
  priceMax: null,
  selectedRoomType: null,        // 'standard' | 'deluxe' | 'suite' | 'studio' | null
  selectedGenderPolicy: null,    // 'male' | 'female' | 'mixed' | null
  selectedFacilityIds: [],       // Array of facility_master IDs yang dipilih sebagai filter
  searchRadius: 5,               // Radius pencarian dalam km (default 5km)

  // ── State Lokasi User ──
  userCurrentLocation: null,     // { latitude, longitude }
  isSearchingByLocation: false,  // Jika true, gunakan GPS + radius

  // ── State Hasil ──
  searchResults: [],
  isLoadingResults: false,
  hasSearched: false,

  // ── Actions ──

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  setSelectedCity: (selectedCity) => set({ selectedCity }),

  setPriceRange: (priceMin, priceMax) => set({ priceMin, priceMax }),

  setSelectedRoomType: (selectedRoomType) => set({ selectedRoomType }),

  setSelectedGenderPolicy: (selectedGenderPolicy) => set({ selectedGenderPolicy }),

  /**
   * Toggle facility ID di filter
   * Jika sudah ada → hapus; jika belum → tambah
   */
  toggleFacilityFilter: (facilityId) =>
    set((state) => {
      const isAlreadySelected = state.selectedFacilityIds.includes(facilityId);
      return {
        selectedFacilityIds: isAlreadySelected
          ? state.selectedFacilityIds.filter((id) => id !== facilityId)
          : [...state.selectedFacilityIds, facilityId],
      };
    }),

  setSearchRadius: (searchRadius) => set({ searchRadius }),

  setUserCurrentLocation: (location) => set({ userCurrentLocation: location }),

  setIsSearchingByLocation: (isSearchingByLocation) => set({ isSearchingByLocation }),

  setSearchResults: (searchResults) =>
    set({ searchResults, isLoadingResults: false, hasSearched: true }),

  setIsLoadingResults: (isLoadingResults) => set({ isLoadingResults }),

  /**
   * Reset semua filter ke nilai awal (tanpa menghapus hasil)
   */
  resetFilters: () =>
    set({
      searchQuery: '',
      selectedCity: null,
      priceMin: null,
      priceMax: null,
      selectedRoomType: null,
      selectedGenderPolicy: null,
      selectedFacilityIds: [],
      searchRadius: 5,
      isSearchingByLocation: false,
    }),

  /**
   * Clear hasil pencarian
   */
  clearResults: () =>
    set({ searchResults: [], hasSearched: false }),
}));

export default useSearchStore;
