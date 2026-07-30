// AdminDashboard method facade: combines small domain modules for the view.
import { adminDashboardPresentationMethods } from './adminDashboardPresentationMethods';
import { adminDashboardNavigationMethods } from './adminDashboardNavigationMethods';
import { adminDashboardDataMethods } from './adminDashboardDataMethods';
import { adminDashboardCatalogMethods } from './adminDashboardCatalogMethods';
import { adminDashboardOrderMethods } from './adminDashboardOrdersMethods';
import { adminDashboardPreviewMethods } from './adminDashboardPreviewMethods';
import { adminDashboardLifecycleMethods } from './adminDashboardLifecycleMethods';

export const adminDashboardMethods = {
  ...adminDashboardPresentationMethods,
  ...adminDashboardNavigationMethods,
  ...adminDashboardDataMethods,
  ...adminDashboardCatalogMethods,
  ...adminDashboardOrderMethods,
  ...adminDashboardPreviewMethods,
  ...adminDashboardLifecycleMethods
};
