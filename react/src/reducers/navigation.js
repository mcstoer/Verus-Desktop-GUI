/*
  This reducer contains user navigation data to
  track where in the app navigation space the user
  is currently.
*/

import { 
  SET_MAIN_NAVIGATION_PATH,
  SET_MODAL_NAVIGATION_PATH,
  LOG_OUT
} from '../util/constants/storeType'
import { PRE_AUTH, CREATE_PROFILE, SELECT_PROFILE } from '../util/constants/componentConstants'

export const navigation = (state = {
  modalPath: '',
  modalPathArray: [],
  mainPath: `${PRE_AUTH}/${CREATE_PROFILE}`,
  mainPathArray: [PRE_AUTH, CREATE_PROFILE]
}, action) => {
  switch (action.type) {
    case SET_MAIN_NAVIGATION_PATH:
      return {
        ...state,
        mainPath: action.navigationPath,
        mainPathArray: action.navigationPathArray
      };
    case SET_MODAL_NAVIGATION_PATH:
      return {
        ...state,
        modalPath: action.navigationPath,
        modalPathArray: action.navigationPathArray
      };
    case LOG_OUT:
      return {
        ...state,
        mainPath: `${PRE_AUTH}/${SELECT_PROFILE}`,
        mainPathArray: [PRE_AUTH, SELECT_PROFILE]
      }
    default:
      return state;
  }
}