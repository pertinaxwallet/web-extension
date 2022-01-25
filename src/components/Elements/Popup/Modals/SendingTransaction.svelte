<script>
  import BigNumber from "bignumber.js";
  import { onMount, getContext, afterUpdate } from "svelte";
  import { _ } from "svelte-i18n";
  import Select from "../../Select";

  //Stores
  import {
    accountStore,
    currentAccount,
    currentNetwork,
  } from "../../../../common/stores.js";

  import {
    fromNano,
    toNano,
    sendRequestReject,
  } from "../../../../common/utils.js";

  //Components
  import { Field, Button, Input } from "svelte-chota";

  export let modalData = {};

  let destination, amount, message;
  let fee = 0;
  let total = 0;
  let allBalance = false;
  let disabled = true;
  let errorAmount = false;

  //Context
  const { closeModal, openModal } = getContext("app_functions");

  let complexItems = [];

  const loadSelectAddressesList = () => {
    browser.runtime
      .sendMessage({
        type: "getAllAccounts",
        data: ["nickname", "address"],
      })
      .then((result) => {
        complexItems = [];
        for (let i in result) {
          if (result[i].address == $currentAccount.address) {
            continue;
          }
          complexItems.push({
            value: result[i].address,
            label: result[i].nickname,
            group: $_("Own addresses"),
          });
        }
        //'Favorite address'
        //'Favorite smart contract'
      });
  };

  onMount(() => {
    destination = document.getElementById("sending-tx-destination");
    amount = document.getElementById("sending-tx-amount");
    message = document.getElementById("sending-tx-message");
    if (modalData.id) {
      const params = modalData.params;
      if (params.amount) {
        amount.value = params.amount;
      }
      if (params.message) {
        message.value = params.message;
      }
      if (params.destination) {
        destination.dataset.value = params.destination;
        destination.value = params.destination;
        validateAddress({});
      }
      loadSelectAddressesList();
    }
  });

  currentAccount.subscribe((value) => {
    loadSelectAddressesList();
  });

  const setMax = () => {
    amount.value = fromNano(
      $currentAccount.balance[$currentNetwork.server]
        ? $currentAccount.balance[$currentNetwork.server]
        : 0
    );
    allBalance = true;
    calculateFee();
  };

  const validateAddressSelect = (event) => {
    if (event.detail == null) {
      disabled = true;
      return;
    }
    const rawAddress = new RegExp(/-?[0-9]{0,10}:[a-fA-F0-9]{64}/);
    const base64Address = new RegExp(/[_\-\/\+a-zA-Z0-9]{48}/);
    if (
      new String(event.detail.value).match(rawAddress) ||
      new String(event.detail.value).match(base64Address)
    ) {
      disabled = false;
      destination.dataset.value = event.detail.value;
      calculateFee();
    } else {
      disabled = true;
    }
  };

  const validateAddress = (event) => {
    const rawAddress = new RegExp(/-?[0-9]{0,10}:[a-fA-F0-9]{64}/);
    const base64Address = new RegExp(/[_\-\/\+a-zA-Z0-9]{48}/);
    if (
      new String(destination.value).match(rawAddress) ||
      new String(destination.value).match(base64Address)
    ) {
      disabled = false;
      destination.dataset.value = destination.value;
      calculateFee();
    } else {
      disabled = true;
    }
  };

  const calculateFee = () => {
    if (amount.value == "") {
      disabled = true;
      return;
    }
    const maxBalance = $currentAccount.balance[$currentNetwork.server]
      ? $currentAccount.balance[$currentNetwork.server]
      : 0;
    if (!allBalance && new BigNumber(toNano(amount.value)).gt(maxBalance)) {
      allBalance = true;
      amount.value = fromNano(maxBalance);
    }
    browser.runtime
      .sendMessage({
        type: "calculateFeeForSafeMultisig",
        data: {
          accountAddress: $currentAccount.address,
          server: $currentNetwork.server,
          txData: {
            type: "send",
            params: {
              amount: toNano(amount.value),
              message: message.value,
              destination: destination.dataset.value,
              allBalance: allBalance,
            },
          },
        },
      })
      .then((result) => {
        fee =
          result.error || typeof result.fee == "undefined"
            ? 0
            : fromNano(result.fee.total_account_fees);
        const maxBalance = $currentAccount.balance[$currentNetwork.server]
          ? $currentAccount.balance[$currentNetwork.server]
          : 0;
        if (allBalance) {
          amount.value = fromNano(maxBalance - toNano(fee));
          total = fromNano(maxBalance);
        } else {
          if (
            new BigNumber(toNano(amount.value) + toNano(fee)).gt(maxBalance)
          ) {
            amount.value = fromNano(maxBalance - toNano(fee));
            total = fromNano(maxBalance);
          } else {
            total = fromNano(toNano(amount.value) + toNano(fee));
          }
        }
        if (fee == 0) {
          disabled = true;
          errorAmount = "Amount can't be less than 0,001";
        } else {
          disabled = false;
          errorAmount = false;
        }
      });
  };

  const cancelTransaction = () => {
    closeModal();
    // send a message that the request is rejected for InPage script
    if (modalData.id) {
      sendRequestReject(modalData.id);
    }
  };

  const confirmTransaction = () => {
    openModal("ModalConfirmTransaction", {
      id: modalData.id,
      accountAddress: $currentAccount.address,
      server: $currentNetwork.server,
      fee: fee,
      txData: {
        type: "send",
        params: {
          amount: toNano(amount.value),
          message: message.value,
          destination: destination.dataset.value,
          allBalance: allBalance,
        },
      },
    });
  };

  const groupBy = (item) => item.group;
</script>

<style>
  .sending-tx-total-wrapper {
    align-content: center;
    display: flex;
    justify-content: center;
    font-size: 1em;
    font-weight: bold;
    margin-bottom: 1em;
  }
  #sending-tx-fee,
  #sending-tx-total {
    flex-direction: row;
  }
  #sending-tx-fee {
    margin-right: 1rem;
    font-weight: 300px;
  }
  #sending-tx-total {
    margin-left: 1rem;
  }
</style>

<div class="sending-tx flex-column">
  <h6>{$_('Send transaction')}</h6>
  <Field label={$_('Address')}>
    <Select
      id="sending-tx-destination"
      items={complexItems}
      {groupBy}
      required
      placeholder={$_('Select or enter a new one') + '...'}
      noOptionsMessage={$_('No matches')}
      on:select={validateAddressSelect}
      on:clear={validateAddressSelect}
      on:keyup={validateAddress} />
  </Field>
  <Field
    label={$_('Amount')}
    gapless
    error={typeof errorAmount === 'string' ? $_(errorAmount) : false}>
    <Button on:click={() => setMax()} outline>{$_('Max')}</Button>
    <Input
      required
      number
      min="0"
      step="any"
      on:input={() => {
        allBalance = false;
        calculateFee();
      }}
      id="sending-tx-amount" />
  </Field>
  <div class="sending-tx-total-wrapper">
    <div id="sending-tx-fee">{$_('Fee')} ~ {fee}</div>
    <div id="sending-tx-total">{$_('Total')} {total}</div>
  </div>
  <Field label={$_('Message')}>
    <Input id="sending-tx-message" />
  </Field>
  <div class="flex-row flow-buttons">
    <Button
      id="cancel-btn"
      class="button__solid button__secondary"
      on:click={() => cancelTransaction()}>
      {$_('Cancel')}
    </Button>
    <Button
      id="save-btn"
      class="button__solid button__primary"
      {disabled}
      on:click={() => confirmTransaction()}>
      {$_('Confirm')}
    </Button>
  </div>
</div>
