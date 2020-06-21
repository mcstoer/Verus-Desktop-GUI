import React from 'react';
import { connect } from 'react-redux';
import { 
  TraditionalSendFormRender
} from './traditionalSendForm.render';
import { checkAddrValidity } from '../../../../util/addrUtils';
import {
  PRIVATE_BALANCE,
  PRIVATE_ADDRS,
  PUBLIC_ADDRS,
  TRANSPARENT_FUNDS,
  ERROR_INVALID_AMOUNT,
  ERROR_AMOUNT_MORE_THAN_BALANCE,
  ERROR_INVALID_ADDR,
  ERROR_Z_AND_NO_FROM,
  SEND_COIN,
  WARNING_SNACK,
  NATIVE,
  TXDATA_TO,
  TXDATA_FROM,
  TXDATA_VALUE,
  TXDATA_FEE,
  TXDATA_TOTAL_AMOUNT,
  TXDATA_BALANCE,
  TXDATA_REMAINING_BALANCE,
  TXDATA_STATUS,
  TXDATA_ERROR,
  TXDATA_TXID,
  CONFIRM_DATA,
  Z_SEND,
  API_SUCCESS,
  ERROR_Z_NOT_SUPPORTED,
  TXDATA_INTEREST,
  SEND_TO_ADDRESS,
  ENTER_DATA,
  TXDATA_FROM_CURRENCY,
  TXDATA_TO_CURRENCY,
  TXDATA_MESSAGE,
  TXDATA_PRICE
} from "../../../../util/constants/componentConstants";
import { newSnackbar } from '../../../../actions/actionCreators';
import { getCurrencyInfo } from '../../../../util/multiverse/multiverseCurrencyUtils';

class TraditionalSendForm extends React.Component {
  constructor(props) {
    super(props);
    this.isIdentity = props.identity != null
    
    const {
      balanceTag,
      chainTicker,
      balances,
      activeCoin,
      currencyInfo,
      conversionGraph,
      isConversion,
      calculateCurrencyData
    } = props;
    const currencyName = currencyInfo != null ? currencyInfo.currency.name : null
    const addresses = this.isIdentity ? props.identity.addresses : props.addresses[chainTicker]
    const { mode } = activeCoin
    
    // false to convert to active currency, true to convert from active currency
    const convertingFrom = isConversion && conversionGraph != null && conversionGraph.to.length > 0
    const convertingTo = isConversion && conversionGraph != null && conversionGraph.from.length > 0
    this.DEFAULT_CURRENCY_CONVERSION = { id: currencyInfo.currency.currencyid, name: currencyName, price: 1 }

    const fromCurrencyConversion = convertingFrom
        ? this.DEFAULT_CURRENCY_CONVERSION
        : convertingTo
        ? conversionGraph.from[0]
        : null
    
    const toCurrencyConversion = convertingTo
      ? this.DEFAULT_CURRENCY_CONVERSION
      : convertingFrom
      ? conversionGraph.to[0]
      : null

    const transparentFundsObj = {
      label: TRANSPARENT_FUNDS,
      address: null,
      balances
    }

    const initAddressMap = () => {
      let addressMap = {}

      addresses[balanceTag === PRIVATE_BALANCE ? PRIVATE_ADDRS : PUBLIC_ADDRS].forEach(addressObj => {
        if (addressObj.balances.native > 0) {
          addressMap[addressObj.address] = {
            label: addressObj.address,
            address: addressObj.address,
            balances: addressObj.balances
          };
        }
      })

      return addressMap
    }

    const addressMap = initAddressMap()
    const addressListFormatted =
      mode === NATIVE && !this.isIdentity && balanceTag !== PRIVATE_BALANCE
        ? [transparentFundsObj, ...Object.values(addressMap)]
        : Object.values(addressMap);

    this.state = {
      sendFrom:
        mode === NATIVE && !this.isIdentity && balanceTag !== PRIVATE_BALANCE
          ? transparentFundsObj
          : addressListFormatted[0],
      sendTo: "",
      amount: "",
      memo: "",
      addressList: addressListFormatted,
      addressMap,
      mint: false,
      convertingFrom,
      convertingTo,
      fromCurrencyConversion,
      toCurrencyConversion,
      displayCurrency:
        currencyName == null
          ? chainTicker
          : convertingTo
          ? fromCurrencyConversion
            ? fromCurrencyConversion.name
            : null
          : currencyName,
      formErrors: {
        amount: [],
        sendFrom: [],
        sendTo: [],
      },
      txDataDisplay: {},
      fromCurrencyInfo: convertingTo
        ? calculateCurrencyData(fromCurrencyConversion.name)
        : currencyInfo,
      toCurrencyInfo: convertingFrom
      ? calculateCurrencyData(toCurrencyConversion.name)
      : currencyInfo,
    };

    this.updateFormData = this.updateFormData.bind(this)
    this.updateSendFrom = this.updateSendFrom.bind(this)
    this.setAndUpdateState = this.setAndUpdateState.bind(this)
    this.updateInput = this.updateInput.bind(this)
    this.updateFormErrors = this.updateFormErrors.bind(this)
    this.generateTxDataDisplay = this.generateTxDataDisplay.bind(this)
    this.setSendAmountAll = this.setSendAmountAll.bind(this)
    this.updateCurrencyConversion = this.updateCurrencyConversion.bind(this)
    this.getBalance = this.getBalance.bind(this)
  }

  componentWillMount() {
    if (Object.keys(this.props.txData).length > 0) {
      this.generateTxDataDisplay()
    }
  }

  componentDidUpdate(lastProps) {
    const { formStep } = this.props
    
    if (lastProps.formStep !== formStep && formStep === ENTER_DATA) {
      this.updateFormErrors()
      this.updateFormData()
    }
  }

  updateSendFrom(value) {
    this.setAndUpdateState({ sendFrom: value })
  }

  getBalance(address, currency) {
    const { balances, chainTicker } = this.props
    const { addressMap } = this.state 

    if (currency == null) currency = chainTicker

    if (balances == null) return null
    else if (address == null) {
      return currency === chainTicker ? balances.native.public.confirmed : (balances.reserve[currency] ? balances.reserve[currency].public.confirmed : 0)
    } else {
      const addr = addressMap[address]

      return currency === chainTicker
        ? addr.balances.native
        : addr.balances.reserve[currency]
        ? addr.balances.reserve[currency]
        : 0;
    }
  }

  updateCurrencyConversion(value, from) {
    if (from) {
      this.setAndUpdateState({ 
        fromCurrencyConversion: value,
        fromCurrencyInfo: this.props.calculateCurrencyData(value.name),
        displayCurrency: value.name
      })
    } else {
      this.setAndUpdateState({ 
        toCurrencyConversion: value,
        toCurrencyInfo: this.props.calculateCurrencyData(value.name),
      })
    }
  }

  generateWarningSnack(warnings) {    
    this.props.dispatch(newSnackbar(WARNING_SNACK, warnings[0].message))
  }

  setSendAmountAll() {
    this.setAndUpdateState({
      amount: this.getBalance(
        this.state.sendFrom.address,
        this.state.displayCurrency
      ),
    });
  }

  generateTxDataDisplay() {
    const { txData, formData, formStep } = this.props

    let txDataSchema = {
      ["Status:"]:
        formStep === CONFIRM_DATA
          ? null
          : txData.cliCmd === Z_SEND && txData[TXDATA_STATUS] === API_SUCCESS
          ? "pending"
          : txData[TXDATA_STATUS],
      ["Error:"]: txData[TXDATA_ERROR],
      [txData.cliCmd === Z_SEND ? "Operation ID:" : "Transaction ID:"]: txData[
        TXDATA_TXID
      ],
      ["To:"]: txData[TXDATA_TO],
      ["From:"]: txData[TXDATA_FROM],
      ["Sending Currency:"]:
        txData[TXDATA_FROM_CURRENCY] != null
          ? txData[TXDATA_FROM_CURRENCY].name
          : null,
      ["Receiving Currency:"]:
        txData[TXDATA_TO_CURRENCY] != null
          ? txData[TXDATA_TO_CURRENCY].name
          : null,
      ["Conversion Price:"]:
        txData[TXDATA_ERROR] ||
        txData[TXDATA_PRICE] == null ||
        txData[TXDATA_FROM_CURRENCY] == null ||
        txData[TXDATA_TO_CURRENCY] == null
          ? null
          : `${txData[TXDATA_PRICE]} ${txData[TXDATA_FROM_CURRENCY].name}/${txData[TXDATA_TO_CURRENCY].name}`,
      ["Est. Amount to Receive"]:
        txData[TXDATA_ERROR] ||
        txData[TXDATA_PRICE] == null ||
        txData[TXDATA_FROM_CURRENCY] == null ||
        txData[TXDATA_TO_CURRENCY] == null ||
        txData[TXDATA_VALUE] == null
          ? null
          : `${Number((Number(txData[TXDATA_VALUE]) * Number(txData[TXDATA_PRICE])).toFixed(8))} ${
              txData[TXDATA_TO_CURRENCY].name
            }`,
      ["Amount Entered"]:
        txData[TXDATA_ERROR] ||
        (!txData[TXDATA_ERROR] &&
          txData[TXDATA_VALUE] &&
          Number(txData[TXDATA_VALUE]) === Number(formData.amount))
          ? null
          : Number(formData.amount),
      ["Transaction Amount:"]:
        txData[TXDATA_ERROR] || !txData[TXDATA_VALUE]
          ? null
          : txData[TXDATA_VALUE],
      ["Fee:"]: txData[TXDATA_FEE],
      [txData.cliCmd === SEND_TO_ADDRESS
        ? formStep === CONFIRM_DATA
          ? "Interest to Claim:"
          : "Interest Claimed:"
        : "Max. Interest Loss"]: txData[TXDATA_INTEREST],
      ["Change in Balance:"]:
        txData[TXDATA_TOTAL_AMOUNT] != null
          ? `${Number(txData[TXDATA_TOTAL_AMOUNT]) < 0 ? "+" : "-"}${
              txData[TXDATA_TOTAL_AMOUNT]
            }`
          : null,
      ["Current Balance:"]: txData[TXDATA_BALANCE],
      ["Est. Balance After Transaction:"]: txData[TXDATA_REMAINING_BALANCE],
      ["Message:"]:
        txData[TXDATA_MESSAGE] == null || txData[TXDATA_MESSAGE].length === 0
          ? null
          : txData[TXDATA_MESSAGE],
    };

    Object.keys(txDataSchema).forEach(txDataKey => {
      if (txDataSchema[txDataKey] == null) delete txDataSchema[txDataKey]
    })

    if (formStep === CONFIRM_DATA && txData.warnings && txData.warnings.length > 0) {
      this.generateWarningSnack(txData.warnings)
    }

    this.setState({ txDataDisplay: txDataSchema })
  }

  updateFormErrors() {
    const { chainTicker, activeCoin, setContinueDisabled } = this.props
    const { amount, sendFrom, sendTo } = this.state
    const { mode } = activeCoin
    let formErrors = {
      amount: [],
      sendFrom: [],
      sendTo: []
    }

    if (amount == null || (amount.length !== 0 && (isNaN(amount) || Number(amount) < 0 || amount.length === 0))) {
      formErrors.amount.push(ERROR_INVALID_AMOUNT)
    } else if (sendFrom.balance < amount) {
      formErrors.amount.push(ERROR_AMOUNT_MORE_THAN_BALANCE)
    }

    if (sendTo == null || (sendTo.length !== 0 && !checkAddrValidity(sendTo, mode, chainTicker))) {
      formErrors.sendTo.push(ERROR_INVALID_ADDR)
    }  
    
    if (sendTo[0] === 'z' && (sendTo.length === 95 || sendTo.length === 78)) {
      if (!sendFrom.address) formErrors.sendFrom.push(ERROR_Z_AND_NO_FROM)

      if (mode !== NATIVE) formErrors.sendFrom.push(ERROR_Z_NOT_SUPPORTED)
    }

    this.setState({ formErrors }, () => {
      setContinueDisabled(!Object.keys(this.state.formErrors).every((formInput) => {
        return (this.state.formErrors[formInput].length == 0)
      }) || amount.length === 0 || sendTo.length === 0)
    })
  }

  setAndUpdateState(stateModifiers) {
    this.setState(stateModifiers, () => {
      this.updateFormErrors()
      this.updateFormData()
    })
  }

  updateInput(e) {
    this.setAndUpdateState({ [e.target.name]: e.target.value })
  }

  updateFormData() {
    const { chainTicker } = this.props
    const {
      sendTo,
      sendFrom,
      amount,
      memo,
      mint,
      fromCurrencyInfo,
      toCurrencyInfo,
      displayCurrency
    } = this.state;
    const currencyId =
      fromCurrencyInfo != null && fromCurrencyInfo.ownedIdentity != null
        ? `${fromCurrencyInfo.ownedIdentity.identity.name}@`
        : null;

    this.props.setFormData({
      chainTicker,
      toAddress: sendTo,
      amount,
      balance: sendFrom
        ? this.getBalance(sendFrom.address, displayCurrency)
        : 0,
      fromAddress: sendFrom ? sendFrom.address : null,
      memo,
      toCurrencyInfo,
      fromCurrencyInfo,
      mint,
      currencyId,
    });
  }

  render() {
    return TraditionalSendFormRender.call(this);
  }
}

const mapStateToProps = (state) => {
  const { chainTicker } = state.modal[SEND_COIN]

  return {
    addresses: state.ledger.addresses,
    activeCoin: state.coins.activatedCoins[chainTicker],
    balances: state.ledger.balances[chainTicker]
  };
};

export default connect(mapStateToProps)(TraditionalSendForm);