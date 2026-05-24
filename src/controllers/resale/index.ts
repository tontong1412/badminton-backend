import controllerErrorHandler from '../../utils/controllerErrorHandler'
import cancelListing from './cancelListing'
import createListing from './createListing'
import getAdminPayouts from './getAdminPayouts'
import getListingById from './getListingById'
import getListings from './getListings'
import markSellerPaid from './markSellerPaid'
import purchaseListing from './purchaseListing'

export default {
  createListing: controllerErrorHandler(createListing),
  getListings: controllerErrorHandler(getListings),
  getAdminPayouts: controllerErrorHandler(getAdminPayouts),
  getListingById: controllerErrorHandler(getListingById),
  purchaseListing: controllerErrorHandler(purchaseListing),
  markSellerPaid: controllerErrorHandler(markSellerPaid),
  cancelListing: controllerErrorHandler(cancelListing),
}